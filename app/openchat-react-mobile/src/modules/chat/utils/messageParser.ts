
export type MessageType = 
    | 'text' 
    | 'image' 
    | 'voice' 
    | 'location' 
    | 'redPacket' 
    | 'file' 
    | 'product' 
    | 'system';

export interface ParsedContent {
    type: MessageType;
    content: string; // Display text or raw content
    meta?: any; // Extra data like duration, file size, product json
}

export const parseMessage = (content: string): ParsedContent => {
    if (!content) return { type: 'text', content: '' };

    // 1. Product Card (JSON format)
    const PRODUCT_MARKER = '[商品]';
    if (content.includes(PRODUCT_MARKER)) {
        const markerIndex = content.indexOf(PRODUCT_MARKER);
        const textPart = content.substring(0, markerIndex).replace(/🛍️$/, '').trim();
        const jsonPart = content.substring(markerIndex + PRODUCT_MARKER.length).trim();
        
        let productData = null;
        try {
            // Clean markdown code blocks if present
            const cleanJson = jsonPart.replace(/^```\w*\s*/, '').replace(/```$/, '');
            const jsonStart = cleanJson.search(/[\{\[]/);
            if (jsonStart !== -1) {
                productData = JSON.parse(cleanJson.substring(jsonStart));
            }
        } catch (e) {
            console.warn('Product parse failed', e);
        }

        return {
            type: 'product',
            content: textPart,
            meta: productData
        };
    }

    // 2. Special Prefixes
    if (content.startsWith('📍 [位置]')) {
        return { type: 'location', content: content.replace('📍 [位置]', '').trim() };
    }
    
    if (content.startsWith('🧧 [红包]')) {
        return { type: 'redPacket', content: content.replace('🧧 [红包]', '').trim() };
    }

    if (content.startsWith('📂 [文件]')) {
        const raw = content.replace('📂 [文件]', '').trim();
        const parts = raw.split('|').map(s => s.trim());
        return {
            type: 'file',
            content: parts[0] || '未知文件',
            meta: { size: parts[1], ext: parts[2] }
        };
    }

    if (content.startsWith('🎤')) {
        const match = content.match(/(\d+")/);
        return { 
            type: 'voice', 
            content: '语音消息', 
            meta: { duration: match ? match[0] : '3"' } 
        };
    }

    // 3. Images (Data URL or Magic Emoji prefix for demo)
    if (content.startsWith('data:image') || content.startsWith('📷') || content.startsWith('🖼️')) {
        // If it has a prefix emoji, strip it for the raw url if possible, or just treat whole string as source if it's a URL
        const clean = content.replace(/^(📷|🖼️)\s*/, '');
        // Simple heuristic: if it looks like a URL or Data URI
        if (clean.startsWith('http') || clean.startsWith('data:')) {
            return { type: 'image', content: clean };
        }
        // Fallback for demo text that just starts with emoji but isn't a real url
        // We'll treat it as text if it's just "📷 looking at this"
        // But for our app's logic:
        return { type: 'image', content: clean }; 
    }

    // 4. Default Text
    return { type: 'text', content };
};
