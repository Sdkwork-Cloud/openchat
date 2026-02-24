
import { BaseEntity } from '../../core/types';

export interface UserAccount extends BaseEntity {
    username: string; // Acts as unique login ID (phone or email)
    passwordHash: string; // Never store plain text
    salt: string;
    userId: string; // Links to UserProfile
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        name: string;
        avatar: string;
    };
}

export interface DecodedToken {
    uid: string;
    exp: number;
    iat: number;
}
