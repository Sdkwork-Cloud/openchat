
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from './services/AuthService';
import { UserService } from '../user/services/UserService';
import { AuthResponse } from './types';

interface AuthContextType {
    user: AuthResponse['user'] | null;
    isLoading: boolean;
    login: (u: string, p: string) => Promise<boolean>;
    register: (u: string, p: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthResponse['user'] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Session Check
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const res = await AuthService.checkSession();
                if (res.success && res.data) {
                    setUser(res.data.user);
                    UserService.setCurrentUserId(res.data.user.id);
                }
            } catch (e) {
                console.error("Auth init failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const login = useCallback(async (u: string, p: string) => {
        const res = await AuthService.login(u, p);
        if (res.success && res.data) {
            setUser(res.data.user);
            UserService.setCurrentUserId(res.data.user.id);
            return true;
        }
        return false;
    }, []);

    const register = useCallback(async (u: string, p: string) => {
        const res = await AuthService.register(u, p);
        if (res.success && res.data) {
            setUser(res.data.user);
            UserService.setCurrentUserId(res.data.user.id);
            return true;
        }
        return false;
    }, []);

    const logout = useCallback(async () => {
        await AuthService.logout();
        setUser(null);
        UserService.setCurrentUserId('');
        // Force clear Router history state if needed
        window.location.hash = '/login';
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
