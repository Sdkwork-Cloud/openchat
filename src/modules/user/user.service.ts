import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserManager } from './user.interface';
import { LocalUserManagerService } from './local-user-manager.service';
import { RemoteUserManagerService } from './remote-user-manager.service';

@Injectable()
export class UserService implements UserManager {
  private userManager: UserManager;

  constructor(
    private configService: ConfigService,
    private localUserManager: LocalUserManagerService,
    @Optional() private remoteUserManager?: RemoteUserManagerService,
  ) {
    const useRemote = this.configService.get<boolean>('USE_REMOTE_USER_SERVICE') || false;
    this.userManager = useRemote && remoteUserManager 
      ? remoteUserManager 
      : localUserManager;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userManager.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.userManager.getUserByUsername(username);
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.userManager.createUser(user);
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | null> {
    return this.userManager.updateUser(id, user);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userManager.deleteUser(id);
  }

  async getUsers(ids: string[]): Promise<User[]> {
    return this.userManager.getUsers(ids);
  }
}