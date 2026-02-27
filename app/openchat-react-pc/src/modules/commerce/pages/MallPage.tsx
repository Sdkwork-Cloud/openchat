import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, ShoppingCart, Filter, Grid, List, ChevronRight,
  Star, Heart, Share2, ShoppingBag, TrendingUp, Sparkles,
  Package, Truck, Shield, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductCategory } from '../types';
import { CommerceService } from '../services/CommerceService';
import { CartService } from '../services/CartService';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from 'sonner';

// 懒加载图片组件
const LazyImage: React.FC<{ src: string; alt: string; className?: string; style?: React.CSSProperties }> = ({ src, alt, className, style }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, !loaded && 'blur-sm')}
      style={style}
      onLoad={() => setLoaded(true)}
    />
  );
};

// 分类导航组件
const CategoryNav: React.FC<{
  categories: ProductCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ categories, selectedId, onSelect }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Grid className="w-5 h-5 text-blue-600" />
          商品分类
        </h3>
      </div>
      <div className="p-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
            selectedId === null 
              ? "bg-blue-50 text-blue-700 font-medium" 
              : "text-gray-700 hover:bg-gray-50"
          )}
        >
          全部商品
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
              selectedId === category.id 
                ? "bg-blue-50 text-blue-700 font-medium" 
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <span className="text-lg">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// 商品卡片组件 - PC端优化版
const ProductCard: React.FC<{
  product: Product;
  viewMode: 'grid' | 'list';
  onAddToCart: (product: Product) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}> = ({ product, viewMode, onAddToCart, onToggleFavorite, isFavorite }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const discountPercent = useMemo(() => {
    if (product.originalPrice && product.originalPrice > product.price) {
      return Math.round((1 - product.price / product.originalPrice) * 100);
    }
    return 0;
  }, [product.price, product.originalPrice]);

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          className="w-48 h-48 flex-shrink-0 cursor-pointer relative overflow-hidden"
          onClick={() => navigate(`/commerce/product/${product.id}`)}
        >
          <LazyImage
            src={product.cover}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          {discountPercent > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              -{discountPercent}%
            </span>
          )}
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1">
            <h3 
              className="font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 line-clamp-2"
              onClick={() => navigate(`/commerce/product/${product.id}`)}
            >
              {product.name}
            </h3>
            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{product.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {product.rating}
              </span>
              <span>{product.sales}人付款</span>
              <span className="text-gray-300">|</span>
              <span>{product.merchantName}</span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <span className="text-2xl font-bold text-red-600">¥{product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="ml-2 text-gray-400 line-through">¥{product.originalPrice.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(product.id);
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isFavorite ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                加入购物车
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="aspect-square relative overflow-hidden cursor-pointer"
        onClick={() => navigate(`/commerce/product/${product.id}`)}
      >
        <LazyImage
          src={product.cover}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
        />
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            -{discountPercent}%
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100",
            isFavorite ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:bg-white"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
        </button>
      </div>
      <div className="p-4">
        <h3 
          className="font-medium text-gray-900 mb-2 cursor-pointer hover:text-blue-600 line-clamp-2 text-sm"
          onClick={() => navigate(`/commerce/product/${product.id}`)}
        >
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-red-600">¥{product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">¥{product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {product.rating}
          </span>
          <span>{product.sales}人付款</span>
        </div>
        <Button
          onClick={() => onAddToCart(product)}
          className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          加入购物车
        </Button>
      </div>
    </div>
  );
};

// 促销横幅组件
const PromoBanner: React.FC = () => {
  const banners = [
    { id: 1, title: '新品首发', subtitle: '限时5折起', color: 'from-purple-500 to-pink-500', icon: Sparkles },
    { id: 2, title: '热销榜单', subtitle: '大家都在买', color: 'from-orange-500 to-red-500', icon: TrendingUp },
    { id: 3, title: '品质保证', subtitle: '正品保障', color: 'from-blue-500 to-cyan-500', icon: Shield },
    { id: 4, title: '极速发货', subtitle: '24小时发货', color: 'from-green-500 to-emerald-500', icon: Truck },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={cn(
            "rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-r",
            banner.color
          )}
        >
          <banner.icon className="w-8 h-8 mb-2" />
          <h4 className="font-semibold">{banner.title}</h4>
          <p className="text-sm opacity-90">{banner.subtitle}</p>
        </div>
      ))}
    </div>
  );
};

// 服务保障组件
const ServiceGuarantee: React.FC = () => {
  const services = [
    { icon: Shield, title: '正品保证', desc: '官方认证' },
    { icon: RotateCcw, title: '7天退换', desc: '无忧售后' },
    { icon: Truck, title: '极速物流', desc: '快速送达' },
    { icon: Package, title: '品质包装', desc: '精心呵护' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
      <div className="grid grid-cols-4 gap-8">
        {services.map((service, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <service.icon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{service.title}</h4>
              <p className="text-sm text-gray-500">{service.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 主页面组件
export const MallPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'sales' | 'rating'>('default');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // 加载数据
  useEffect(() => {
    loadCategories();
    loadProducts();
    loadCartCount();
  }, []);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMoreProducts();
    }
  }, [inView]);

  // 简单的Intersection Observer实现
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await CommerceService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await CommerceService.getProducts({
        categoryId: selectedCategory,
        search: searchQuery,
        sort: sortBy,
        page: 1,
        pageSize: 20,
      });
      setProducts(data.items);
      setHasMore(data.hasMore);
      setPage(1);
    } catch (error) {
      showToast('加载商品失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreProducts = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const data = await CommerceService.getProducts({
        categoryId: selectedCategory,
        search: searchQuery,
        sort: sortBy,
        page: page + 1,
        pageSize: 20,
      });
      setProducts((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to load more products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const count = await CartService.getCartItemCount();
      setCartCount(count);
    } catch (error) {
      console.error('Failed to load cart count:', error);
    }
  };

  const handleSearch = useCallback(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, sortBy]);

  const handleAddToCart = async (product: Product) => {
    try {
      await CartService.addToCart({
        productId: product.id,
        quantity: 1,
      });
      setCartCount((prev) => prev + 1);
      showToast('已添加到购物车', 'success');
    } catch (error) {
      showToast('添加失败', 'error');
    }
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        showToast('已取消收藏', 'info');
      } else {
        next.add(productId);
        showToast('已添加到收藏', 'success');
      }
      return next;
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 顶部搜索栏 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索商品..."
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
            <Button
              variant="outline"
              className="relative"
              onClick={() => navigate('/commerce/cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/commerce/orders')}
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              我的订单
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* 促销横幅 */}
        <PromoBanner />

        {/* 服务保障 */}
        <ServiceGuarantee />

        <div className="flex gap-6">
          {/* 左侧分类导航 */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-24">
              <CategoryNav
                categories={categories}
                selectedId={selectedCategory}
                onSelect={(id) => {
                  setSelectedCategory(id);
                  loadProducts();
                }}
              />
            </div>
          </div>

          {/* 右侧商品列表 */}
          <div className="flex-1">
            {/* 筛选和排序栏 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">筛选</span>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    loadProducts();
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">默认排序</option>
                  <option value="price-asc">价格从低到高</option>
                  <option value="price-desc">价格从高到低</option>
                  <option value="sales">销量优先</option>
                  <option value="rating">评分优先</option>
                </select>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'grid' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'list' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 商品列表 */}
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-4"
            )}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onAddToCart={handleAddToCart}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorite={favorites.has(product.id)}
                />
              ))}
            </div>

            {/* 加载更多 */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    加载中...
                  </div>
                ) : (
                  <span className="text-gray-400">向下滚动加载更多</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
