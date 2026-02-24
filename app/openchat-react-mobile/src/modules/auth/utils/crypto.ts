
/**
 * Cryptographic utilities for secure client-side authentication.
 */

// Generate a random salt
export const generateSalt = (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Hash password with salt using SHA-256
export const hashPassword = async (password: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Simulate JWT Generation (Base64 encoded JSON)
export const generateToken = (userId: string): string => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
        uid: userId,
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    }));
    const signature = btoa("mock_signature_secret"); // In real app, this is server-side
    return `${header}.${payload}.${signature}`;
};

export const verifyToken = (token: string): { valid: boolean; uid?: string } => {
    try {
        const [_, payloadStr] = token.split('.');
        const payload = JSON.parse(atob(payloadStr));
        
        if (Date.now() > payload.exp) {
            return { valid: false };
        }
        return { valid: true, uid: payload.uid };
    } catch (e) {
        return { valid: false };
    }
};
