
import React, { useState, useEffect } from 'react';
import { navigate, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Sidebar, SidebarItem } from '../../../components/Sidebar/Sidebar';
import { ProductService, Product } from '../services/ProductService';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { SmartImage } from '../../../components/SmartImage/SmartImage';

// Mock Categories Structure
const CATEGORIES = [
    { id: 'recom', name: '推荐' },
    { id: 'tech', name: '数码电器' },
    { id: 'clothing', name: '潮流服饰' },
    { id: 'home', name: '居家生活' },
    { id: 'beauty', name: '美妆护肤' },
    { id: 'food', name: '美食酒水' },
    { id: 'sports', name: '运动户外' },
    { id: 'book', name: '图书文具' },
    { id: 'pet', name: '宠物生活' },
];

const CategoryGrid: React.FC<{ items: Product[], title: string }> = ({ items, title }) => (
    <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {items.map(item => (
                <div 
                    key={item.id} 
                    onClick={() => navigate('/commerce/item', { id: item.id })}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                >
                    <SmartImage 
                        src={item.cover} 
                        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} 
                        radius={8}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '6px', textAlign: 'center', lineHeight: 1.2, height: '28px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.title}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const CategoryPage: React.FC = () => {
    const [activeKey, setActiveKey] = useState<string | number>('recom');
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        loadProducts(activeKey);
    }, [activeKey]);

    const loadProducts = async (cat: string | number) => {
        // Fetch products based on category
        // 'recom' fetches all for demo diversity, others filter
        const apiCat = cat === 'recom' ? 'all' : cat as any;
        const res = await ProductService.getFeed(apiCat);
        if (res.success && res.data) {
            setProducts(res.data.content);
        }
    };

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="全部分类" onBack={() => navigateBack('/commerce/mall')} />
            
            <div style={{ borderBottom: '0.5px solid var(--border-color)' }}>
                <SearchInput value="" onChange={()=>{}} placeholder="搜索商品" onClick={() => navigate('/commerce/mall')} />
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Sidebar */}
                <Sidebar activeKey={activeKey} onChange={setActiveKey} width="90px" style={{ background: 'var(--bg-body)' }}>
                    {CATEGORIES.map(cat => (
                        <SidebarItem key={cat.id} title={cat.name} itemKey={cat.id} />
                    ))}
                </Sidebar>

                {/* Right Content */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)' }}>
                    {/* Banner for Category */}
                    <div style={{ padding: '16px 16px 0 16px' }}>
                         <div style={{ width: '100%', height: '80px', borderRadius: '12px', background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                             <div>
                                 <div style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{CATEGORIES.find(c => c.id === activeKey)?.name}专场</div>
                                 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>爆款好物 限时特惠</div>
                             </div>
                         </div>
                    </div>

                    <CategoryGrid items={products} title="热门推荐" />
                    
                    {/* Mock sub-categories just by slicing data for demo visualization */}
                    {products.length > 3 && (
                        <CategoryGrid items={products.slice(3)} title="猜你喜欢" />
                    )}
                </div>
            </div>
        </div>
    );
};
