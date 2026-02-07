
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';

export interface UserStatus {
    icon: string;
    text: string;
    isActive: boolean;
}

export interface UserProfile extends BaseEntity {
    name: string;
    wxid: string;
    avatar: string;
    region: string;
    status: UserStatus;
}

/**
 * Singleton Service Pattern implementation using AbstractStorageService.
 * We treat the profile as a collection of 1 item for simplicity in reusing the base class,
 * or we could just use a separate key. Here we stick to the BaseService pattern.
 */
class UserServiceImpl extends AbstractStorageService<UserProfile> {
    protected STORAGE_KEY = 'sys_user_profile_v1';
    private readonly PROFILE_ID = 'u_current_user';

    constructor() {
        super();
        this.initProfile();
    }

    private async initProfile() {
        const list = await this.loadData();
        if (list.length === 0) {
            const now = Date.now();
            const defaultProfile: UserProfile = {
                id: this.PROFILE_ID,
                createTime: now,
                updateTime: now,
                name: 'AI User',
                wxid: 'ai_88888888',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                region: 'China Shanghai',
                status: {
                    icon: '✨',
                    text: 'Feeling lucky',
                    isActive: true
                }
            };
            await this.save(defaultProfile);
        }
    }

    async getProfile(): Promise<Result<UserProfile>> {
        // Always fetch the specific ID
        const result = await this.findById(this.PROFILE_ID);
        if (result.success && result.data) {
            return result;
        }
        // Fallback (shouldn't happen after init)
        await this.initProfile();
        return this.findById(this.PROFILE_ID);
    }

    async updateStatus(text: string, icon: string = '✨'): Promise<Result<void>> {
        const { data: profile } = await this.getProfile();
        if (profile) {
            profile.status = { text, icon, isActive: true };
            await this.save(profile);
            return { success: true };
        }
        return { success: false, message: 'Profile not initialized' };
    }

    async updateInfo(updates: Partial<UserProfile>): Promise<Result<void>> {
        const { data: profile } = await this.getProfile();
        if (profile) {
            Object.assign(profile, updates);
            await this.save(profile);
            return { success: true };
        }
        return { success: false };
    }
}

export const UserService = new UserServiceImpl();
