
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result } from '../../../core/types';
import { Platform } from '../../../platform';

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
    gender: 'male' | 'female';
    signature: string;
}

class UserServiceImpl extends AbstractStorageService<UserProfile> {
    protected STORAGE_KEY = 'sys_user_profile_v3';
    // Cache current user ID in memory for session duration
    private currentUserId: string | null = null;

    constructor() {
        super();
    }

    /**
     * Set the active user context (Called by AuthProvider)
     */
    public setCurrentUserId(id: string) {
        this.currentUserId = id;
    }

    /**
     * Create a new profile for a registered user
     */
    async createProfile(userId: string, username: string): Promise<Result<UserProfile>> {
        const now = Date.now();
        // Generate a random avatar seed
        const seed = Math.random().toString(36).substring(7);
        
        const newProfile: UserProfile = {
            id: userId,
            createTime: now,
            updateTime: now,
            name: `User_${username.slice(-4)}`,
            wxid: `wx_${username}`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
            region: 'China',
            gender: 'male',
            signature: 'Hello OpenChat!',
            status: { icon: '✨', text: 'Active', isActive: true }
        };
        
        return await this.save(newProfile);
    }

    /**
     * Get profile by specific ID
     */
    async getProfileById(id: string): Promise<Result<UserProfile>> {
        const res = await this.findById(id);
        if (res.success && res.data) return res;
        
        // Fallback for mock users/contacts if needed, but return failure for auth users
        return { success: false, message: 'Profile not found' };
    }

    /**
     * Get CURRENT logged in profile
     */
    async getProfile(): Promise<Result<UserProfile>> {
        if (!this.currentUserId) return { success: false, message: 'No active session' };
        return this.getProfileById(this.currentUserId);
    }

    async updateInfo(updates: Partial<UserProfile>): Promise<Result<void>> {
        if (!this.currentUserId) return { success: false, message: 'No active session' };
        
        const { data: profile } = await this.getProfileById(this.currentUserId);
        if (profile) {
            Object.assign(profile, updates);
            await this.save(profile);
            return { success: true };
        }
        return { success: false };
    }

    async uploadAvatar(file: File): Promise<Result<string>> {
        await new Promise(resolve => setTimeout(resolve, 600));
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ success: true, data: reader.result as string });
            reader.onerror = (error) => reject(error);
        });
    }
}

export const UserService = new UserServiceImpl();
