
import { ILLMProvider, ChatMessage, GeneratorConfig } from '../types';

export class MockProvider implements ILLMProvider {
  name = 'Mock/Debug';

  async *generateStream(
    history: ChatMessage[], 
    prompt: string, 
    images?: { mimeType: string; data: string }[],
    config?: GeneratorConfig
  ): AsyncGenerator<string, void, unknown> {
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    let response = "";
    const lowerQuery = prompt.toLowerCase();
    const instruction = config?.systemInstruction || "";

    // 1. Image Recognition Mock
    if (images && images.length > 0) {
        response = "我看到了一张图片！[Mock Vision] 这看起来像是一个用户上传的内容。如果是商品图，我可以帮你查找同款。";
    }
    // 2. Commerce: Purchase Flow (Strict "Order" intent only)
    else if (lowerQuery.startsWith('下单') || lowerQuery.startsWith('结账')) {
        const productName = prompt.replace('下单', '').replace('结账', '').replace(/[:：]/g, '').trim() || '商品';
        const orderData = [{
            id: "order_new",
            name: `${productName} (待付款)`,
            price: 2499,
            image: `https://api.dicebear.com/7.x/shapes/svg?seed=${productName}`,
            desc: "订单已生成，请在 15 分钟内完成支付。",
            bannerTitle: "支付立减",
            bannerSub: "使用XX银行卡再减5元",
            shopName: "OpenChat 自营",
            distance: "0m",
            rating: 5.0
        }];
        response = `好的，为您生成订单：\n\n[商品] ${JSON.stringify(orderData)}`;
    }
    // 3. Commerce: Recommendation Flow (MULTI-PRODUCT)
    // Matches "推荐", "买", "购买", "shopping" etc.
    else if (instruction.includes('Shopping') || lowerQuery.includes('推荐') || lowerQuery.includes('买') || lowerQuery.includes('购') || lowerQuery.includes('耳机')) {
        if (lowerQuery.includes('奶茶') || lowerQuery.includes('tea')) {
             const drinks = [
                {
                    id: "tea_1",
                    name: "杨枝甘露 (超大杯)",
                    price: 22,
                    originalPrice: 28,
                    image: "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=600",
                    reason: "销量冠军，芒果果肉含量极高，夏日必点。",
                    tags: ["必喝榜", "0卡糖"],
                    shopName: "七分甜",
                    rating: 4.9
                },
                {
                    id: "tea_2",
                    name: "生椰拿铁 (热)",
                    price: 18,
                    image: "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=600",
                    reason: "口感顺滑，适合现在的天气。",
                    tags: ["暖饮", "提神"],
                    shopName: "瑞幸咖啡",
                    rating: 4.7
                },
                {
                    id: "tea_3",
                    name: "芝士葡萄",
                    price: 29,
                    image: "https://images.unsplash.com/photo-1626809712140-192b6a707472?w=600",
                    reason: "喜欢果茶的话，这款是绝对的首选。",
                    tags: ["鲜果", "芝士"],
                    shopName: "喜茶",
                    rating: 4.8
                }
            ];
            
            response = `根据您的口味和当前天气，为您精选了以下 3 款饮品。**七分甜**的杨枝甘露目前好评率最高：\n\n[商品] ${JSON.stringify(drinks)}`;
        } 
        else {
            // Default: Headphones comparison
            const products = [
                {
                    id: "sony_xm5",
                    name: "Sony WH-1000XM5",
                    price: 2499,
                    originalPrice: 2999,
                    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600",
                    reason: "综合降噪能力最强，适合差旅办公。",
                    tags: ["年度机皇", "超长续航"],
                    shopName: "Sony 旗舰店",
                    rating: 4.9
                },
                {
                    id: "bose_qc45",
                    name: "Bose QC45",
                    price: 1999,
                    originalPrice: 2299,
                    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600",
                    reason: "佩戴舒适度极佳，长时间佩戴无压力。",
                    tags: ["舒适", "经典"],
                    shopName: "Bose 专卖",
                    rating: 4.7
                },
                {
                    id: "apple_max",
                    name: "AirPods Max",
                    price: 3999,
                    image: "https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=600",
                    reason: "苹果生态首选，空间音频体验震撼。",
                    tags: ["生态互联", "金属质感"],
                    shopName: "Apple Store",
                    rating: 4.8
                }
            ];
            response = `为您对比了市面上最热门的 3 款降噪耳机。如果您追求极致降噪，推荐首选 **Sony XM5**：\n\n[商品] ${JSON.stringify(products)}`;
        }
    } 
    // Default Chat
    else {
        response = `[模拟回复] 我收到了您的消息："${prompt}"。\n\n您可以试试发送 **“推荐耳机”** 或 **“想喝奶茶”** 来体验多商品推荐卡片。`;
    }

    const chunkSize = 5; 
    for (let i = 0; i < response.length; i += chunkSize) {
        yield response.slice(i, i + chunkSize);
        await new Promise(r => setTimeout(r, 10)); 
    }
  }
}
