import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { ContactEntity } from './contact.entity';
import {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactQueryParams,
  ContactManager,
  ContactType,
} from './contact.interface';

@Injectable()
export class ContactService implements ContactManager {
  constructor(
    @InjectRepository(ContactEntity)
    private contactRepository: Repository<ContactEntity>,
  ) {}

  /**
   * 创建联系人
   */
  async createContact(request: CreateContactRequest): Promise<Contact> {
    // 检查是否已存在相同联系人
    const existingContact = await this.getContactByTarget(
      request.userId,
      request.contactId,
      request.type,
    );

    if (existingContact) {
      throw new ConflictException('联系人已存在');
    }

    const contact = this.contactRepository.create({
      userId: request.userId,
      contactId: request.contactId,
      type: request.type,
      source: request.source || 'manual',
      name: request.name,
      remark: request.remark,
      tags: request.tags || [],
      status: 'active',
      isFavorite: false,
    });

    const savedContact = await this.contactRepository.save(contact);
    return this.mapToContact(savedContact);
  }

  /**
   * 获取联系人详情
   */
  async getContactById(id: string): Promise<Contact | null> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return null;
    }

    return this.mapToContact(contact);
  }

  /**
   * 获取用户的联系人列表
   */
  async getContactsByUserId(params: ContactQueryParams): Promise<Contact[]> {
    const { userId, type, source, status, isFavorite, tag, keyword, limit = 50, offset = 0 } = params;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (source) {
      where.source = source;
    }

    if (status) {
      where.status = status;
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite;
    }

    if (tag) {
      where.tags = Like(`%${tag}%`);
    }

    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    const contacts = await this.contactRepository.find({
      where,
      order: {
        isFavorite: 'DESC',
        lastContactTime: 'DESC',
        name: 'ASC',
      },
      take: limit,
      skip: offset,
    });

    return contacts.map((contact) => this.mapToContact(contact));
  }

  /**
   * 获取用户与特定目标的联系人
   */
  async getContactByTarget(
    userId: string,
    contactId: string,
    type: ContactType,
  ): Promise<Contact | null> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type },
    });

    if (!contact) {
      return null;
    }

    return this.mapToContact(contact);
  }

  /**
   * 更新联系人
   */
  async updateContact(id: string, request: UpdateContactRequest): Promise<Contact | null> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return null;
    }

    if (request.name !== undefined) {
      contact.name = request.name;
    }

    if (request.remark !== undefined) {
      contact.remark = request.remark;
    }

    if (request.tags !== undefined) {
      contact.tags = request.tags;
    }

    if (request.isFavorite !== undefined) {
      contact.isFavorite = request.isFavorite;
    }

    if (request.status !== undefined) {
      contact.status = request.status;
    }

    const updatedContact = await this.contactRepository.save(contact);
    return this.mapToContact(updatedContact);
  }

  /**
   * 删除联系人
   */
  async deleteContact(id: string): Promise<boolean> {
    const result = await this.contactRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * 批量删除联系人
   */
  async batchDeleteContacts(ids: string[]): Promise<boolean> {
    const result = await this.contactRepository.delete({
      id: In(ids),
    });
    return (result.affected || 0) > 0;
  }

  /**
   * 设置/取消收藏
   */
  async setFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return false;
    }

    contact.isFavorite = isFavorite;
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 设置备注
   */
  async setRemark(id: string, remark: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return false;
    }

    contact.remark = remark;
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 添加标签
   */
  async addTag(id: string, tag: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return false;
    }

    if (!contact.tags) {
      contact.tags = [];
    }

    if (!contact.tags.includes(tag)) {
      contact.tags.push(tag);
      await this.contactRepository.save(contact);
    }

    return true;
  }

  /**
   * 移除标签
   */
  async removeTag(id: string, tag: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact || !contact.tags) {
      return false;
    }

    contact.tags = contact.tags.filter((t) => t !== tag);
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 更新最后联系时间
   */
  async updateLastContactTime(id: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      return false;
    }

    contact.lastContactTime = new Date();
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 搜索联系人
   */
  async searchContacts(userId: string, keyword: string): Promise<Contact[]> {
    const contacts = await this.contactRepository.find({
      where: [
        { userId, name: Like(`%${keyword}%`) },
        { userId, remark: Like(`%${keyword}%`) },
      ],
      order: {
        isFavorite: 'DESC',
        name: 'ASC',
      },
    });

    return contacts.map((contact) => this.mapToContact(contact));
  }

  /**
   * 获取联系人统计
   */
  async getContactStats(userId: string): Promise<{
    total: number;
    userCount: number;
    groupCount: number;
    favoriteCount: number;
    blockedCount: number;
  }> {
    const [total, userCount, groupCount, favoriteCount, blockedCount] = await Promise.all([
      this.contactRepository.count({ where: { userId } }),
      this.contactRepository.count({ where: { userId, type: 'user' } }),
      this.contactRepository.count({ where: { userId, type: 'group' } }),
      this.contactRepository.count({ where: { userId, isFavorite: true } }),
      this.contactRepository.count({ where: { userId, status: 'blocked' } }),
    ]);

    return {
      total,
      userCount,
      groupCount,
      favoriteCount,
      blockedCount,
    };
  }

  /**
   * 映射实体到接口
   */
  private mapToContact(entity: ContactEntity): Contact {
    return {
      id: entity.id,
      uuid: entity.uuid,
      userId: entity.userId,
      contactId: entity.contactId,
      type: entity.type,
      source: entity.source,
      name: entity.name,
      avatar: entity.avatar,
      remark: entity.remark,
      status: entity.status,
      isFavorite: entity.isFavorite,
      tags: entity.tags,
      extraInfo: entity.extraInfo,
      lastContactTime: entity.lastContactTime,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
