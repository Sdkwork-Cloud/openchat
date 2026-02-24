
import React, { useEffect, useState, useRef } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ProductService, Product } from '../services/ProductService';
import { DistributionService } from '../services/DistributionService';
import { Toast } from '../../../components/Toast';
import { Empty } from '../../../components/Empty/Empty';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Platform } from '../../../platform';
import { Tabs } from '../../../components/Tabs/Tabs';
import { llmService } from '../../../services/llm';

// --- AI Promotion Sheet ---
const PromotionSheet = ({ 
    visible, 
    product, 
    onClose 
}: { 
    visible: boolean; 
    product: Product | null; 
    onClose: () => void; 
}) => {
    const [activeStyle, setActiveStyle] = useState('moments');
    const [copy, setCopy] = useState('');
    const [generating, setGenerating] = useState(false);
    const abortController = useRef<AbortController | null>(null);

    // AI Tools Config
    const MAGIC_TOOLS = [
        { id: 'emoji', label: '加 Emoji', icon: '✨', prompt: '请保持原有意思不变，在文案中适当增加更多Emoji表情，使语气更活泼生动。' },
        { id: 'short', label: '精简', icon: '✂️', prompt: '请将这段文案精简到100字以内，保留核心卖点和价格，语言更紧凑。' },
        { id: 'expand', label: '扩写', icon: '📝', prompt: '请丰富这段文案的细节，增加使用场景描述和感性描写，使其更具感染力。' },
        { id: 'formal', label: '商务风', icon: '👔', prompt: '请将这段文案改为更加专业、商务的语气，适合发给客户或在正式群组发布。' }
    ];

    useEffect(() => {
        if (visible && product) {
            generateCopy(activeStyle);
        }
        return () => {
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, [visible, product, activeStyle]);

    const generateCopy = async (styleOrInstruction: string, isRefinement = false) => {
        if (!product) return;
        
        // Cancel previous
        if (abortController.current) abortController.current.abort();
        abortController.current = new AbortController();

        setGenerating(true);
        if (!isRefinement) setCopy(''); // Clear if new generation, keep if refining (optional, but cleaner to stream new)
        
        let promptText = '';

        if (isRefinement) {
            // Context: Previous Copy + Product Info + Instruction
            promptText = `
当前文案：
"""
${copy}
"""

商品信息：${product.title}，价格 ¥${product.price}。

修改要求：${styleOrInstruction}
请直接输出修改后的文案，不要包含任何解释性语言。`;
            setCopy(''); // Clear to show streaming new version
        } else {
            // New Generation
            const prompts: Record<string, string> = {
                moments: `你是一位金牌带货主播。请为商品【${product.title}】（价格：¥${product.price}）写一条微信朋友圈推广文案。
要求：
1. 开头要有吸引力，多用Emoji（🔥、✨、💰等）。
2. 突出性价比和"${product.subTitle}"这个卖点。
3. 结尾引导扫码或点击链接下单。
4. 语气热情、亲切，像朋友推荐。`,
                
                group: `你是一位社群团长。请为商品【${product.title}】写一条社群接龙文案。
要求：
1. 格式清晰，分点陈述。
2. 包含原价 ¥${product.originalPrice || product.price * 1.2} 和团购价 ¥${product.price} 的对比。
3. 营造抢购氛围（如“限量50份”、“手慢无”）。
4. 包含“回复+1参与接龙”的引导。`,
                
                xiaohongshu: `你是一位小红书博主。请为【${product.title}】写一篇种草笔记。
要求：
1. 标题要抓眼球（如“绝绝子”、“无限回购”、“提升幸福感”）。
2. 正文分享使用场景和感受，感性一点。
3. 文末添加5个相关的热门话题标签（如 #好物推荐 #宝藏神器）。
4. 多用Emoji，排版活泼。`
            };
            promptText = prompts[styleOrInstruction] || prompts.moments;
        }

        try {
            const stream = llmService.chatStream([], promptText);
            for await (const chunk of stream) {
                if (abortController.current?.signal.aborted) break;
                setCopy(prev => prev + chunk);
            }
        } catch (e) {
            console.error(e);
            setCopy(prev => prev + '\n[系统] AI 网络抖动，请重试。');
        } finally {
            if (!abortController.current?.signal.aborted) {
                setGenerating(false);
                Platform.device.vibrate(10);
            }
        }
    };

    const handleCopy = () => {
        Platform.clipboard.write(copy);
        Toast.success('文案已复制');
        onClose();
    };

    const handleSaveImage = () => {
        Toast.loading('正在合成海报...');
        setTimeout(() => {
            Toast.success('海报已保存相册');
            onClose();
        }, 1000);
    };

    if (!product) return null;

    const commission = DistributionService.calculateCommission(product.price, 0.15);

    return (
        <ActionSheet visible={visible} onClose={onClose} height="auto">
            <div style={{ padding: '20px 20px 40px 20px' }}>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f5f5f5' }}>
                        <img src={product.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', lineHeight: 1.3 }}>{product.title}</div>
                        <div style={{ fontSize: '12px', color: '#fa5151', background: 'rgba(250, 81, 81, 0.1)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                            预计赚 ¥{commission}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <Tabs 
                        items={[
                            { id: 'moments', label: '朋友圈风' },
                            { id: 'group', label: '社群接龙' },
                            { id: 'xiaohongshu', label: '小红书风' }
                        ]}
                        activeId={activeStyle}
                        onChange={setActiveStyle}
                        variant="segment"
                    />
                </div>

                {/* AI Text Area */}
                <div style={{ 
                    background: 'var(--bg-body)', borderRadius: '12px', padding: '16px', 
                    fontSize: '14px', lineHeight: '1.6', minHeight: '140px', maxHeight: '200px', overflowY: 'auto',
                    marginBottom: '12px', whiteSpace: 'pre-wrap', position: 'relative',
                    color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                    transition: 'border-color 0.2s'
                }}>
                    {copy}
                    {generating && <span className="typing-cursor">|</span>}
                    {generating && copy.length === 0 && <span style={{color: 'var(--text-placeholder)'}}>AI 正在思考文案...</span>}
                </div>

                {/* Magic Tools */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {MAGIC_TOOLS.map(tool => (
                        <div 
                            key={tool.id}
                            onClick={() => !generating && generateCopy(tool.prompt, true)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 12px', borderRadius: '16px',
                                background: 'rgba(41, 121, 255, 0.08)', color: 'var(--primary-color)',
                                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                opacity: generating ? 0.5 : 1, flexShrink: 0
                            }}
                        >
                            <span>{tool.icon}</span>
                            <span>{tool.label}</span>
                        </div>
                    ))}
                    <div 
                        onClick={() => !generating && generateCopy(activeStyle)}
                        style={{ padding: '6px 12px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', opacity: generating ? 0.5 : 1, flexShrink: 0 }}
                    >
                        🔄 重写
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={handleSaveImage}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        保存海报
                    </button>
                    <button 
                        onClick={handleCopy}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary-gradient)', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        复制文案
                    </button>
                </div>
            </div>
            <style>{`
                .typing-cursor { animation: blink 1s infinite; margin-left: 2px; color: var(--primary-color); font-weight: bold; }
                @keyframes blink { 50% { opacity: 0; } }
            `}</style>
        </ActionSheet>
    );
};

const DistProductCard: React.FC<{ product: Product, onPromote: (p: Product) => void }> = ({ product, onPromote }) => {
    const commission = DistributionService.calculateCommission(product.price, 0.15); 

    return (
        <div style={{ background: 'var(--bg-card)', padding: '12px', marginBottom: '12px', borderRadius: '12px', display: 'flex', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f5f5f5' }}>
                <img src={product.cover} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4, height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: 'var(--text-primary)' }}>{product.title}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#fa5151', background: 'rgba(250, 81, 81, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px' }}>
                            赚 ¥{commission}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            售价 <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'DIN Alternate' }}>¥{product.price}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => onPromote(product)}
                        style={{ 
                            background: 'var(--primary-gradient)', color: 'white', border: 'none', 
                            padding: '6px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: 600,
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(41, 121, 255, 0.2)'
                        }}
                    >
                        立即推广
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DistributionGoodsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        const load = async () => {
            const res = await ProductService.getFeed('all');
            if (res.success && res.data) setProducts(res.data.content);
        };
        load();
    }, []);

    const handlePromote = (p: Product) => {
        Platform.device.vibrate(5);
        setSelectedProduct(p);
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="分销选品" onBack={() => navigateBack('/commerce/distribution')} />
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {['全部', '高佣榜', '实时热销', '素材丰富'].map((tag, i) => (
                        <div key={tag} style={{ padding: '6px 12px', borderRadius: '16px', background: i===0 ? 'var(--text-primary)' : 'var(--bg-card)', color: i===0 ? 'var(--bg-card)' : 'var(--text-primary)', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {tag}
                        </div>
                    ))}
                </div>

                {products.length > 0 ? (
                    products.map(p => <DistProductCard key={p.id} product={p} onPromote={handlePromote} />)
                ) : (
                    <Empty text="暂无分销商品" />
                )}
            </div>

            <PromotionSheet 
                visible={!!selectedProduct} 
                product={selectedProduct} 
                onClose={() => setSelectedProduct(null)} 
            />
        </div>
    );
};
