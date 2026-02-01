import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactEntity } from './contact.entity';
import { ContactService } from './contact.service';

/**
 * 联系人关系类型
 */
export type ContactRelationType = 'friend' | 'blocked' | 'pending' | 'none';

/**
 * 联系人关系服务
 * 管理用户与其他用户的关系状态
 * 不存储独立数据，只操作Contact实体
 */
@Injectable()
export class ContactRelationService {
  constructor(
    @InjectRepository(ContactEntity)
    private contactRepository: Repository<ContactEntity>,
    private contactService: ContactService,
  ) {}

  /**
   * 建立好友关系
   * 将联系人标记为好友关系
   */
  async establishFriendRelation(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user' },
    });

    if (!contact) {
      // 如果不存在联系人，创建一个新的好友联系人
      return false; // 应该由调用方先创建联系人
    }

    contact.source = 'friend';
    contact.status = 'active';
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 拉黑联系人
   */
  async blockContact(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user' },
    });

    if (!contact) {
      // 创建一个新的拉黑记录
      await this.contactService.createContact({
        userId,
        contactId,
        type: 'user',
        source: 'manual',
        name: contactId, // 临时名称，后续可以更新
        remark: '已拉黑',
      });
      
      const newContact = await this.contactRepository.findOne({
        where: { userId, contactId, type: 'user' },
      });
      
      if (newContact) {
        newContact.status = 'blocked';
        await this.contactRepository.save(newContact);
      }
      return true;
    }

    contact.status = 'blocked';
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 取消拉黑
   */
  async unblockContact(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user', status: 'blocked' },
    });

    if (!contact) {
      return false;
    }

    // 如果来源是manual，删除联系人
    // 如果来源是friend，恢复为active
    if (contact.source === 'manual') {
      await this.contactRepository.delete(contact.id);
    } else {
      contact.status = 'active';
      await this.contactRepository.save(contact);
    }
    
    return true;
  }

  /**
   * 获取关系类型
   */
  async getRelationType(userId: string, contactId: string): Promise<ContactRelationType> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user' },
    });

    if (!contact) {
      return 'none';
    }

    if (contact.status === 'blocked') {
      return 'blocked';
    }

    if (contact.source === 'friend') {
      return 'friend';
    }

    return 'none';
  }

  /**
   * 检查是否为好友
   */
  async isFriend(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user', source: 'friend', status: 'active' },
    });
    return !!contact;
  }

  /**
   * 检查是否被拉黑
   */
  async isBlocked(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { userId, contactId, type: 'user', status: 'blocked' },
    });
    return !!contact;
  }

  /**
   * 获取所有好友ID列表
   */
  async getFriendIds(userId: string): Promise<string[]> {
    const contacts = await this.contactRepository.find({
      where: { 
        userId, 
        type: 'user', 
        source: 'friend', 
        status: 'active' 
      },
    });
    return contacts.map(contact => contact.contactId);
  }

  /**
   * 获取所有被拉黑的用户ID列表
   */
  async getBlockedIds(userId: string): Promise<string[]> {
    const contacts = await this.contactRepository.find({
      where: { 
        userId, 
        type: 'user', 
        status: 'blocked' 
      },
    });
    return contacts.map(contact => contact.contactId);
  }

  /**
   * 删除关系
   * 删除好友关系，但保留联系人记录（改为manual来源）
   */
  async removeFriendRelation(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: { 
        userId, 
        contactId, 
        type: 'user', 
        source: 'friend' 
      },
    });

    if (!contact) {
      return false;
    }

    // 改为manual来源，不再是好友
    contact.source = 'manual';
    await this.contactRepository.save(contact);
    return true;
  }

  /**
   * 彻底删除联系人（包括关系）
   */
  async deleteContactRelation(userId: string, contactId: string): Promise<boolean> {
    const result = await this.contactRepository.delete({
      userId,
      contactId,
      type: 'user',
    });
    return (result.affected || 0) > 0;
  }
}
