import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, MessageSquare, ShoppingBag, Zap, Settings, 
  Check, Trash2, Filter, MoreHorizontal, Archive,
  Mail, AlertCircle, CheckCheck, ChevronRight
} from 'lucide-react';
import { NotificationService } from '../services/NotificationService';
import { Notification, NotificationType, NotificationStats } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Separator } from '../../../components/ui/Separator';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from '../../../components/ui/DropdownMenu';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '../../../components/ui/Tooltip';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow } from '../../../lib/date';
import { toast } from 'sonner';

interface FilterOption {
  id: string;
  label: string;
  icon: React.ElementType;
  type: NotificationType | 'all';
  color: string;
}

const filters: FilterOption[] = [
  { id: 'all', label: '全部通知', icon: Bell, type: 'all', color: 'bg-blue-500' },
  { id: 'message', label: '消息', icon: MessageSquare, type: 'message', color: 'bg-green-500' },
  { id: 'social', label: '互动', icon: Mail, type: 'social', color: 'bg-orange-500' },
  { id: 'order', label: '交易', icon: ShoppingBag, type: 'order', color: 'bg-purple-500' },
  { id: 'system', label: '系统', icon: AlertCircle, type: 'system', color: 'bg-gray-500' },
  { id: 'promotion', label: '活动', icon: Zap, type: 'promotion', color: 'bg-red-500' },
];

const getTypeColor = (type: NotificationType): string => {
  const colors: Record<NotificationType, string> = {
    system: 'bg-gray-500',
    social: 'bg-orange-500',
    order: 'bg-purple-500',
    promotion: 'bg-red-500',
    message: 'bg-green-500',
  };
  return colors[type] || 'bg-gray-500';
};

const getTypeIcon = (type: NotificationType): React.ElementType => {
  const icons: Record<NotificationType, React.ElementType> = {
    system: AlertCircle,
    social: Mail,
    order: ShoppingBag,
    promotion: Zap,
    message: MessageSquare,
  };
  return icons[type] || Bell;
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  const activeType = filters.find(f => f.id === activeFilter)?.type || 'all';

  const { data: notificationsResult, viewStatus, refresh } = useLiveQuery(
    () => NotificationService.getNotifications({ type: activeType }),
    [activeType]
  );
  const notifications: Notification[] = (notificationsResult?.data as Notification[]) || [];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data } = await NotificationService.getStats();
    if (data) setStats(data);
  };

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      await NotificationService.markRead(notification.id);
      loadStats();
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    const type = activeType === 'all' ? undefined : activeType;
    await NotificationService.markAllRead(type);
    toast.success('已全部标记为已读');
    refresh();
    loadStats();
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await NotificationService.delete(id);
    toast.success('通知已删除');
    refresh();
    loadStats();
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const handleMarkUnread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await NotificationService.markUnread(id);
    toast.success('已标记为未读');
    refresh();
    loadStats();
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (window.confirm('确定清空当前列表的所有通知吗？此操作不可恢复。')) {
      for (const n of notifications) {
        await NotificationService.delete(n.id);
      }
      toast.success('已清空所有通知');
      refresh();
      loadStats();
      setSelectedNotification(null);
    }
  };

  const unreadCount = stats?.unread || 0;

  return (
    <TooltipProvider>
      <div className="h-full w-full flex">
        {/* Left Sidebar - Filters */}
        <div className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">消息中心</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate('/settings/notifications')}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>通知设置</TooltipContent>
              </Tooltip>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {unreadCount} 条未读消息
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filters.map((filter) => {
                const count = filter.type === 'all' 
                  ? stats?.total 
                  : stats?.byType[filter.type];
                const isActive = activeFilter === filter.id;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", filter.color)} />
                    <filter.icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{filter.label}</span>
                    {count !== undefined && count > 0 && (
                      <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleMarkAllRead}
              disabled={notifications.filter(n => !n.isRead).length === 0}
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              清空列表
            </Button>
          </div>
        </div>

        {/* Middle - Notification List */}
        <div className="w-96 border-r bg-card flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {filters.find(f => f.id === activeFilter)?.label}
              </span>
              <Badge variant="secondary">{notifications.length}</Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleMarkAllRead}>
                  <Check className="w-4 h-4 mr-2" />
                  标记全部已读
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearAll}>
                  <Archive className="w-4 h-4 mr-2" />
                  清空当前列表
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
                  <Settings className="w-4 h-4 mr-2" />
                  通知设置
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Bell className="w-12 h-12 mb-4 opacity-20" />
                <p>暂无通知</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.type);
                  const isSelected = selectedNotification?.id === notification.id;
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors group relative",
                        isSelected 
                          ? "bg-primary/5 border-l-2 border-l-primary" 
                          : "hover:bg-muted/50 border-l-2 border-l-transparent",
                        !notification.isRead && "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          getTypeColor(notification.type),
                          "text-white"
                        )}>
                          {notification.meta?.sender?.avatar ? (
                            <img 
                              src={notification.meta.sender.avatar} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{notification.icon}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              "text-sm truncate",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {notification.createTime ? formatDistanceToNow(notification.createTime) : '-'}
                            </span>
                          </div>
                          
                          <p className={cn(
                            "text-sm mt-1 line-clamp-2",
                            notification.isRead ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {notification.content}
                          </p>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.isRead ? (
                              <button
                                onClick={(e) => handleMarkUnread(notification.id, e)}
                                className="text-xs text-primary hover:underline"
                              >
                                标记已读
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleMarkUnread(notification.id, e)}
                                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                              >
                                标记未读
                              </button>
                            )}
                            <span className="text-muted-foreground">·</span>
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="text-xs text-destructive hover:underline"
                            >
                              删除
                            </button>
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right - Detail View */}
        <div className="flex-1 bg-background flex flex-col">
          {selectedNotification ? (
            <>
              <div className="p-6 border-b">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                    getTypeColor(selectedNotification.type),
                    "text-white"
                  )}>
                    {selectedNotification.meta?.sender?.avatar ? (
                      <img 
                        src={selectedNotification.meta.sender.avatar} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{selectedNotification.icon}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{selectedNotification.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{filters.find(f => f.type === selectedNotification.type)?.label}</span>
                      <span>·</span>
                      <span>{selectedNotification.createTime ? formatDistanceToNow(selectedNotification.createTime) : '-'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!selectedNotification.isRead && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          NotificationService.markRead(selectedNotification.id);
                          refresh();
                          loadStats();
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        标记已读
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(selectedNotification.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.content}
                  </p>

                  {selectedNotification.meta?.sender && (
                    <div className="mt-8 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-3">发送者</h4>
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedNotification.meta.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedNotification.meta.sender.name}`}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{selectedNotification.meta.sender.name}</p>
                          <p className="text-sm text-muted-foreground">用户</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNotification.link && (
                    <div className="mt-6">
                      <Button 
                        onClick={() => navigate(selectedNotification.link!)}
                        className="gap-2"
                      >
                        查看详情
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">选择一条通知查看详情</p>
              <p className="text-sm mt-1">点击左侧列表中的通知</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
