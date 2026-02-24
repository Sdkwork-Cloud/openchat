
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface Contact extends BaseEntity {
  name: string;
  avatar: string;
  wxid: string;
  region: string;
  isNew?: boolean;
}

class ContactServiceImpl extends AbstractStorageService<Contact> {
  protected STORAGE_KEY = 'sys_contacts_v2';

  constructor() {
      super();
      this.initMockData();
  }

  private async initMockData() {
      const list = await this.loadData();
      if (list.length === 0) {
          // Seed Data
          const now = Date.now();
          const seeds: Partial<Contact>[] = [
            { id: '1', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Alice', wxid: 'alice_01', region: 'USA' },
            { id: '2', name: 'Agent Smith', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Agent', wxid: 'matrix_001', region: 'Matrix' },
            { id: '3', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Bob', wxid: 'bob_builder', region: 'UK' },
            { id: '4', name: 'Catherine', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Catherine', wxid: 'cat_00', region: 'France' },
            { id: '5', name: 'David', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=David', wxid: 'dave_x', region: 'USA' },
            { id: '6', name: 'Elon', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Elon', wxid: 'mars_king', region: 'Mars' },
            { id: '7', name: 'Felix', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Felix', wxid: 'felix_cat', region: 'Germany' },
            { id: '8', name: 'George', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=George', wxid: 'geo_jungle', region: 'Africa' },
            { id: '9', name: 'Harry', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Harry', wxid: 'wizard_h', region: 'UK' },
            { id: '10', name: 'Ivy', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Ivy', wxid: 'poison_ivy', region: 'Gotham' }
          ];
          
          for (const s of seeds) {
              await this.save({ ...s, createTime: now, updateTime: now } as Contact);
          }
      }
  }

  async findByName(name: string): Promise<Result<Contact>> {
    const list = await this.loadData();
    const contact = list.find(c => c.name === name);
    if (contact) return { success: true, data: contact };
    return { success: false, message: 'Contact not found' };
  }

  async addContact(contact: Partial<Contact>): Promise<Result<Contact>> {
      // Check for duplicates
      const list = await this.loadData();
      const exists = list.some(c => c.name === contact.name);
      if (exists) return { success: false, message: 'Contact already exists' };

      const newContact = {
          ...contact,
          id: contact.id || crypto.randomUUID(),
          wxid: contact.wxid || `wx_${Date.now()}`,
          region: contact.region || 'Unknown',
          createTime: Date.now(),
          updateTime: Date.now()
      } as Contact;

      return await this.save(newContact);
  }

  /**
   * Optimized Grouping Algorithm
   * Returns contacts grouped by first letter (A-Z, #)
   */
  async getGroupedContacts(): Promise<Result<{ groups: Record<string, Contact[]>, sortedKeys: string[] }>> {
    const { data } = await this.findAll({ 
        pageRequest: { page: 1, size: 10000 },
        sort: { field: 'name', order: 'asc' }
    });
    const contacts = data?.content || [];

    const groups: Record<string, Contact[]> = {};
    
    contacts.forEach(contact => {
        const firstChar = contact.name[0].toUpperCase();
        // Regex to check if it's a latin letter
        const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(contact);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    return {
        success: true,
        data: { groups, sortedKeys }
    };
  }
}

export const ContactService = new ContactServiceImpl();
