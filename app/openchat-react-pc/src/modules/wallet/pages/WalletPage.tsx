import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Gift,
  TrendingUp, TrendingDown, Filter, Download, Plus, Search,
  ChevronRight, MoreHorizontal, Wallet2, Banknote
} from 'lucide-react';
import { WalletService } from '../services/WalletService';
import { WalletData, Transaction, WalletStats, PaymentMethod } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Input } from '../../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { cn } from '../../../lib/utils';
import { formatCurrency } from '../../../lib/utils';
import { toast } from 'sonner';

const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-lg transition-colors">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
      )}>
        {isIncome ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{transaction.title}</span>
          <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{transaction.description}</p>
      </div>
      <div className="text-right">
        <div className={cn(
          "font-semibold",
          isIncome ? "text-green-600" : "text-red-600"
        )}>
          {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
        </div>
        <div className="text-xs text-muted-foreground">
          {transaction.createTime ? new Date(transaction.createTime).toLocaleDateString() : '-'}
        </div>
      </div>
    </div>
  );
};

const PaymentMethodCard: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
      method.isDefault ? "border-primary bg-primary/5" : "hover:bg-muted/50"
    )}>
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
        {method.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium flex items-center gap-2">
          {method.name}
          {method.isDefault && <Badge className="text-xs">默认</Badge>}
        </div>
        {method.last4 && (
          <div className="text-sm text-muted-foreground">**** {method.last4}</div>
        )}
      </div>
      <div className={cn(
        "w-2 h-2 rounded-full",
        method.isEnabled ? "bg-green-500" : "bg-gray-300"
      )} />
    </div>
  );
};

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('全部');
  const categories = WalletService.getCategories();

  useEffect(() => {
    loadWalletData();
    loadStats();
    loadPaymentMethods();
  }, []);

  const loadWalletData = async () => {
    const { data } = await WalletService.getWalletData();
    if (data) setWalletData(data);
  };

  const loadStats = async () => {
    const { data } = await WalletService.getStats();
    if (data) setStats(data);
  };

  const loadPaymentMethods = async () => {
    const { data } = await WalletService.getPaymentMethods();
    if (data) setPaymentMethods(data);
  };

  const { data: transactionsData, viewStatus, refresh } = useLiveQuery(
    () => WalletService.getTransactions({
      type: filterType === 'all' ? undefined : filterType,
      category: filterCategory === '全部' ? undefined : filterCategory
    }),
    [filterType, filterCategory]
  );

  const transactions: Transaction[] = (transactionsData as any)?.content || [];

  return (
    <div className="h-full w-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            钱包
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              导出账单
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              充值
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white/80 text-sm font-normal">总资产</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {walletData ? formatCurrency(walletData.balance) : '¥0.00'}
                  </div>
                  <div className="text-white/70 text-sm mt-1">
                    可用余额
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">今日收入</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    +{walletData ? formatCurrency(walletData.dailyIncome) : '¥0.00'}
                  </div>
                  <div className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    较昨日 +12.5%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-muted-foreground">本月支出</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    -{walletData ? formatCurrency(walletData.monthlyExpense) : '¥0.00'}
                  </div>
                  <div className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    较上月 -8.3%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { icon: ArrowUpRight, label: '转账', color: 'bg-blue-100 text-blue-600' },
                { icon: Gift, label: '发红包', color: 'bg-red-100 text-red-600' },
                { icon: CreditCard, label: '收款', color: 'bg-green-100 text-green-600' },
                { icon: Banknote, label: '提现', color: 'bg-purple-100 text-purple-600' },
              ].map((action, idx) => (
                <button
                  key={idx}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  onClick={() => toast.info(`${action.label}功能开发中`)}
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", action.color)}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>交易记录</CardTitle>
                  <div className="flex items-center gap-2">
                    <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                      <TabsList>
                        <TabsTrigger value="all">全部</TabsTrigger>
                        <TabsTrigger value="income">收入</TabsTrigger>
                        <TabsTrigger value="expense">支出</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>暂无交易记录</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {transactions.map(tx => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden lg:block">
        <div className="p-6">
          {/* Payment Methods */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">支付方式</h4>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {paymentMethods.map(method => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className="mb-6">
              <h4 className="font-semibold mb-4">收支概览</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">总收入</span>
                  <span className="text-green-600 font-medium">+{formatCurrency(stats.totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">总支出</span>
                  <span className="text-red-600 font-medium">-{formatCurrency(stats.totalExpense)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">交易笔数</span>
                  <span className="font-medium">{stats.transactionCount} 笔</span>
                </div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {stats && Object.keys(stats.categoryBreakdown).length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">支出分类</h4>
              <div className="space-y-2">
                {Object.entries(stats.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
