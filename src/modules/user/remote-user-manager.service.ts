import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { User, UserManager } from './user.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RemoteUserManagerService implements UserManager {
  private apiUrl: string;
  private apiKey: string;
  private readonly logger = new Logger(RemoteUserManagerService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:8000';
    this.apiKey = this.configService.get<string>('USER_SERVICE_API_KEY') || '';
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await this.httpService.get(`${this.apiUrl}/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return response?.data;
    } catch (error) {
      this.logger.error('Failed to get user by id:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const response = await this.httpService.get(`${this.apiUrl}/users`, {
        params: { username },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return response?.data?.[0] || null;
    } catch (error) {
      this.logger.error('Failed to get user by username:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const response = await this.httpService.post(`${this.apiUrl}/users`, userData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return response?.data;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      const response = await this.httpService.put(`${this.apiUrl}/users/${id}`, userData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return response?.data;
    } catch (error) {
      this.logger.error('Failed to update user:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.httpService.delete(`${this.apiUrl}/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return true;
    } catch (error) {
      this.logger.error('Failed to delete user:', error);
      return false;
    }
  }

  async getUsers(ids: string[]): Promise<User[]> {
    try {
      const response = await this.httpService.get(`${this.apiUrl}/users/batch`, {
        params: { ids: ids.join(',') },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }).toPromise();
      return response?.data || [];
    } catch (error) {
      this.logger.error('Failed to get users:', error);
      return [];
    }
  }
}
