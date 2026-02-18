import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, DataSource } from 'typeorm';
import { ContactEntity } from './contact.entity';
import {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactQueryParams,
  ContactManager,
  ContactType,
} from './contact.interface';
import { BaseEntityService } from '../../common/base/entity.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class ContactService extends BaseEntityService<ContactEntity> implements ContactManager {
  protected readonly logger = new Logger(ContactService.name);
  protected readonly entityName = 'Contact';

  constructor(
    protected readonly dataSource: DataSource,
    @InjectRepository(ContactEntity)
    protected readonly repository: Repository<ContactEntity>,
    eventBus: EventBusService,
    cacheService: CacheService,
  ) {
    super(dataSource, repository, eventBus, cacheService);
  }

  async createContact(request: CreateContactRequest): Promise<Contact> {
    const existingContact = await this.getContactByTarget(
      request.userId,
      request.contactId,
      request.type,
    );

    if (existingContact) {
      throw new ConflictException('联系人已存在');
    }

    const contact = this.repository.create({
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

    const savedContact = await this.repository.save(contact);
    return this.mapToContact(savedContact);
  }

  async getContactById(id: string): Promise<Contact | null> {
    const contact = await this.findOne(id);
    return contact ? this.mapToContact(contact) : null;
  }

  async getContactsByUserId(params: ContactQueryParams): Promise<Contact[]> {
    const { userId, type, source, status, isFavorite, tag, keyword, limit = 50, offset = 0 } = params;

    const where: any = { userId, isDeleted: false };

    if (type) where.type = type;
    if (source) where.source = source;
    if (status) where.status = status;
    if (isFavorite !== undefined) where.isFavorite = isFavorite;
    if (tag) where.tags = Like(`%${tag}%`);
    if (keyword) where.name = Like(`%${keyword}%`);

    const contacts = await this.repository.find({
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

  async getContactByTarget(
    userId: string,
    contactId: string,
    type: ContactType,
  ): Promise<Contact | null> {
    const contact = await this.repository.findOne({
      where: { userId, contactId, type, isDeleted: false },
    });

    return contact ? this.mapToContact(contact) : null;
  }

  async updateContact(id: string, request: UpdateContactRequest): Promise<Contact | null> {
    const contact = await this.findOne(id);
    if (!contact) return null;

    if (request.name !== undefined) contact.name = request.name;
    if (request.remark !== undefined) contact.remark = request.remark;
    if (request.tags !== undefined) contact.tags = request.tags;
    if (request.isFavorite !== undefined) contact.isFavorite = request.isFavorite;
    if (request.status !== undefined) contact.status = request.status;

    const updatedContact = await this.repository.save(contact);
    return this.mapToContact(updatedContact);
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isDeleted: true });
    return (result.affected || 0) > 0;
  }

  async batchDeleteContacts(ids: string[]): Promise<boolean> {
    const result = await this.repository.update(
      { id: In(ids) } as any,
      { isDeleted: true },
    );
    return (result.affected || 0) > 0;
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    const contact = await this.findOne(id);
    if (!contact) return false;

    contact.isFavorite = isFavorite;
    await this.repository.save(contact);
    return true;
  }

  async setRemark(id: string, remark: string): Promise<boolean> {
    const contact = await this.findOne(id);
    if (!contact) return false;

    contact.remark = remark;
    await this.repository.save(contact);
    return true;
  }

  async addTag(id: string, tag: string): Promise<boolean> {
    const contact = await this.findOne(id);
    if (!contact) return false;

    if (!contact.tags) contact.tags = [];
    if (!contact.tags.includes(tag)) {
      contact.tags.push(tag);
      await this.repository.save(contact);
    }

    return true;
  }

  async removeTag(id: string, tag: string): Promise<boolean> {
    const contact = await this.findOne(id);
    if (!contact || !contact.tags) return false;

    contact.tags = contact.tags.filter((t: string) => t !== tag);
    await this.repository.save(contact);
    return true;
  }

  async updateLastContactTime(id: string): Promise<boolean> {
    const contact = await this.findOne(id);
    if (!contact) return false;

    contact.lastContactTime = new Date();
    await this.repository.save(contact);
    return true;
  }

  async searchContacts(userId: string, keyword: string): Promise<Contact[]> {
    const contacts = await this.repository.find({
      where: [
        { userId, name: Like(`%${keyword}%`), isDeleted: false },
        { userId, remark: Like(`%${keyword}%`), isDeleted: false },
      ],
      order: {
        isFavorite: 'DESC',
        name: 'ASC',
      },
    });

    return contacts.map((contact) => this.mapToContact(contact));
  }

  async getContactStats(userId: string): Promise<{
    total: number;
    userCount: number;
    groupCount: number;
    favoriteCount: number;
    blockedCount: number;
  }> {
    const [total, userCount, groupCount, favoriteCount, blockedCount] = await Promise.all([
      this.repository.count({ where: { userId, isDeleted: false } }),
      this.repository.count({ where: { userId, type: 'user', isDeleted: false } }),
      this.repository.count({ where: { userId, type: 'group', isDeleted: false } }),
      this.repository.count({ where: { userId, isFavorite: true, isDeleted: false } }),
      this.repository.count({ where: { userId, status: 'blocked', isDeleted: false } }),
    ]);

    return { total, userCount, groupCount, favoriteCount, blockedCount };
  }

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
