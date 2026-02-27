import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Trash2, Minus, Plus, ChevronRight, ShoppingBag,
  MapPin, Truck, Shield, AlertCircle, ArrowLeft
} from 'lucide-react';
import { CartService, CartSummary } from '../services/CartService';
import { CartItem } from '../types';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

// 懒加载图片组件
const LazyImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, !loaded && 'blur-sm')}
      onLoad={() => setLoaded(true)}
    />
  );
};

// 简单的Modal组件
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

// 购物车项组件
const CartItemCard: React.FC<{
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onToggleSelect: (itemId: string, selected: boolean) => void;
  onRemove: (itemId: string) => void;
}> = ({ item, onUpdateQuantity, onToggleSelect, onRemove }) => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > 99 || isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl p-4 border transition-all",
      item.selected ? "border-blue-500 shadow-sm" : "border-gray-100"
    )}>
      <div className="flex items-start gap-4">
        <Checkbox
          checked={item.selected}
          onCheckedChange={(checked) => onToggleSelect(item.id, checked as boolean)}
          className="mt-1"
        />
        
        <div 
          className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/commerce/product/${item.productId}`)}
        >
          <LazyImage
            src={item.product.cover}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 
            className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 line-clamp-2"
            onClick={() => navigate(`/commerce/product/${item.productId}`)}
          >
            {item.product.name}
          </h3>
          
          {item.skuInfo && Object.keys(item.skuInfo).length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {Object.entries(item.skuInfo).map(([key, value]) => `${key}: ${value}`).join('; ')}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-bold text-red-600">
              ¥{item.product.price.toFixed(2)}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(item.quantity - 1)}
                disabled={item.quantity <= 1 || isUpdating}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item.quantity + 1)}
                disabled={item.quantity >= 99 || isUpdating}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// 空购物车组件
const EmptyCart: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart className="w-16 h-16 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">购物车是空的</h3>
      <p className="text-gray-500 mb-6">快去挑选心仪的商品吧</p>
      <Button onClick={() => navigate('/commerce/mall')}>
        <ShoppingBag className="w-5 h-5 mr-2" />
        去购物
      </Button>
    </div>
  );
};

// 结算栏组件
const CheckoutBar: React.FC<{
  cartSummary: CartSummary;
  onSelectAll: (selected: boolean) => void;
  onCheckout: () => void;
}> = ({ cartSummary, onSelectAll, onCheckout }) => {
  const allSelected = cartSummary.items.length > 0 && cartSummary.items.every(item => item.selected);
  const someSelected = cartSummary.items.some(item => item.selected);

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll(checked as boolean)}
          />
          <span className="text-gray-700">
            全选 ({cartSummary.items.length})
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            已选 {cartSummary.selectedCount} 件
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500">合计:</span>
              <span className="text-2xl font-bold text-red-600">
                ¥{cartSummary.selectedAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              不含运费
            </p>
          </div>
          <Button
            onClick={onCheckout}
            disabled={cartSummary.selectedCount === 0}
            className="min-w-[140px]"
          >
            结算 ({cartSummary.selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
};

// 主页面组件
export const ShoppingCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const data = await CartService.getCart();
      setCartSummary(data);
    } catch (error) {
      showToast('加载购物车失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await CartService.updateCartItem({ itemId, quantity });
      await loadCart();
    } catch (error) {
      showToast('更新数量失败', 'error');
    }
  };

  const handleToggleSelect = async (itemId: string, selected: boolean) => {
    try {
      await CartService.selectItem(itemId, selected);
      await loadCart();
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleSelectAll = async (selected: boolean) => {
    try {
      await CartService.selectAll(selected);
      await loadCart();
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await CartService.removeFromCart(itemId);
      await loadCart();
      showToast('已删除商品', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleClearCart = async () => {
    try {
      await CartService.clearCart();
      await loadCart();
      setShowClearConfirm(false);
      showToast('购物车已清空', 'success');
    } catch (error) {
      showToast('清空失败', 'error');
    }
  };

  const handleCheckout = () => {
    if (!cartSummary || cartSummary.selectedCount === 0) return;
    navigate('/commerce/checkout');
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (!cartSummary || cartSummary.items.length === 0) {
    return (
      <div className="h-full w-full bg-gray-50 overflow-y-auto">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">购物车</h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm">
            <EmptyCart />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto pb-24">
      <div className="px-6 py-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">购物车 ({cartSummary.totalCount})</h1>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-gray-500 hover:text-red-500 transition-colors"
          >
            清空购物车
          </button>
        </div>

        <div className="flex gap-6">
          {/* 左侧商品列表 */}
          <div className="flex-1">
            <div className="space-y-4">
              {cartSummary.items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onToggleSelect={handleToggleSelect}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>

          {/* 右侧订单摘要 */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* 订单摘要卡片 */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">订单摘要</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">商品总价</span>
                    <span>¥{cartSummary.selectedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">运费</span>
                    <span className="text-green-600">免运费</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">合计</span>
                      <span className="text-xl font-bold text-red-600">
                        ¥{cartSummary.selectedAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={cartSummary.selectedCount === 0}
                  className="w-full mt-6"
                >
                  去结算 ({cartSummary.selectedCount})
                </Button>
              </div>

              {/* 服务保障 */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600">正品保证</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-600">极速发货</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <span className="text-gray-600">7天无理由退换</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 清空确认弹窗 */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">确认清空购物车？</h3>
          <p className="text-gray-600 mb-6">
            此操作将删除购物车中的所有商品，是否继续？
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleClearCart}>
              确认清空
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
