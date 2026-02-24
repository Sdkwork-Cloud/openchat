
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result } from '../../../core/types';
import { UserAccount, AuthResponse } from '../types';
import { generateSalt, hashPassword, generateToken, verifyToken } from '../utils/crypto';
import { UserService } from '../../user/services/UserService';
import { Platform } from '../../../platform';

class AuthServiceImpl extends AbstractStorageService<UserAccount> {
    protected STORAGE_KEY = 'sys_auth_users_v1';
    private TOKEN_KEY = 'sys_auth_token';

    async register(username: string, password: string): Promise<Result<AuthResponse>> {
        const list = await this.loadData();
        
        if (list.find(u => u.username === username)) {
            return { success: false, message: '该账号已存在' };
        }

        const salt = generateSalt();
        const hash = await hashPassword(password, salt);
        const userId = `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const now = Date.now();

        const newAccount: UserAccount = {
            id: crypto.randomUUID(),
            username,
            passwordHash: hash,
            salt,
            userId,
            createTime: now,
            updateTime: now
        };
        await this.save(newAccount);
        await UserService.createProfile(userId, username);

        return this.login(username, password);
    }

    async login(username: string, password: string): Promise<Result<AuthResponse>> {
        const list = await this.loadData();
        const account = list.find(u => u.username === username);

        if (!account) {
            return { success: false, message: '账号或密码错误' };
        }

        const hash = await hashPassword(password, account.salt);
        if (hash !== account.passwordHash) {
            return { success: false, message: '账号或密码错误' };
        }

        const token = generateToken(account.userId);
        await Platform.storage.set(this.TOKEN_KEY, token);
        const profileRes = await UserService.getProfileById(account.userId);
        
        return {
            success: true,
            data: {
                token,
                user: {
                    id: account.userId,
                    username: account.username,
                    name: profileRes.data?.name || username,
                    avatar: profileRes.data?.avatar || ''
                }
            }
        };
    }

    /**
     * 模拟 OAuth 2.0 第三方社交登录
     */
    async loginWithSocial(provider: 'github' | 'google' | 'wechat'): Promise<Result<AuthResponse>> {
        // 1. 模拟网络往返与授权中心处理延迟
        await new Promise(r => setTimeout(r, 1500));

        // 2. 模拟从不同提供商获取的 Profile
        const mockProfiles = {
            github: { name: 'Geek_Octocat', id: 'gh_888', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=gh_888' },
            google: { name: 'Alpha_Go', id: 'goog_999', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=goog_999' },
            wechat: { name: '微信用户', id: 'wx_123', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=wx_123' }
        };
        const profile = mockProfiles[provider];

        const username = `${provider}_${profile.id}`;
        const userId = `u_social_${profile.id}`;
        const now = Date.now();

        // 3. 检查是否有此社交账号关联，无则执行静默注册
        const list = await this.loadData();
        let account = list.find(u => u.username === username);

        if (!account) {
            const salt = generateSalt();
            const pass = await hashPassword('social_placeholder', salt); 
            account = {
                id: crypto.randomUUID(),
                username,
                passwordHash: pass,
                salt,
                userId,
                createTime: now,
                updateTime: now
            };
            await this.save(account);
            
            // 创建用户档案，并注入社交信息
            await UserService.createProfile(userId, profile.name);
            await UserService.setCurrentUserId(userId);
            await UserService.updateInfo({ avatar: profile.avatar });
        }

        // 4. 生成会话 Token
        const token = generateToken(userId);
        await Platform.storage.set(this.TOKEN_KEY, token);

        return {
            success: true,
            data: {
                token,
                user: {
                    id: userId,
                    username: username,
                    name: profile.name,
                    avatar: profile.avatar
                }
            }
        };
    }

    async logout(): Promise<void> {
        await Platform.storage.remove(this.TOKEN_KEY);
    }

    async checkSession(): Promise<Result<AuthResponse>> {
        const token = await Platform.storage.get(this.TOKEN_KEY);
        if (!token) return { success: false };

        const { valid, uid } = verifyToken(token);
        if (!valid || !uid) return { success: false };

        const profileRes = await UserService.getProfileById(uid);
        const list = await this.loadData();
        const account = list.find(u => u.userId === uid);

        return {
            success: true,
            data: {
                token,
                user: {
                    id: uid,
                    username: account?.username || '',
                    name: profileRes.data?.name || 'User',
                    avatar: profileRes.data?.avatar || ''
                }
            }
        };
    }
}

export const AuthService = new AuthServiceImpl();
