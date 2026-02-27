import React, { useState } from 'react';
import { Bell, MessageSquare, Users, Info, Moon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface SettingGroup {
  title: string;
  icon: React.ElementType;
  items: SettingItem[];
}

export const NotificationPage: React.FC = () => {
  const [groups, setGroups] = useState<SettingGroup[]>([
    {
      title: '消息通知',
      icon: MessageSquare,
      items: [
        { id: 'message_preview', label: '消息预览', description: '在通知中显示消息内容', enabled: true },
        { id: 'message_sound', label: '消息提示音', description: '收到消息时播放提示音', enabled: true },
        { id: 'message_vibration', label: '震动提醒', description: '收到消息时震动', enabled: false },
      ],
    },
    {
      title: '群组通知',
      icon: Users,
      items: [
        { id: 'group_message', label: '群组消息', description: '接收群组消息通知', enabled: true },
        { id: 'group_mention', label: '@提及提醒', description: '有人@你时发送通知', enabled: true },
      ],
    },
    {
      title: '系统通知',
      icon: Info,
      items: [
        { id: 'system_updates', label: '系统更新', description: '接收应用更新通知', enabled: true },
        { id: 'marketing_emails', label: '营销邮件', description: '接收促销和活动信息', enabled: false },
      ],
    },
  ]);

  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');

  const toggleItem = (groupIndex: number, itemId: string) => {
    setGroups((prev) => {
      const next = [...prev];
      const item = next[groupIndex].items.find((i) => i.id === itemId);
      if (item) {
        item.enabled = !item.enabled;
      }
      return next;
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Bell className="w-7 h-7 text-blue-500" />
        通知设置
      </h1>

      {/* 免打扰模式 */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">免打扰模式</h3>
              <p className="text-sm text-gray-500">在指定时间段内静音所有通知</p>
            </div>
          </div>
          <button
            onClick={() => setDoNotDisturb(!doNotDisturb)}
            className={cn(
              "w-14 h-7 rounded-full transition-colors relative",
              doNotDisturb ? "bg-blue-500" : "bg-gray-300"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform",
                doNotDisturb ? "left-8" : "left-1"
              )}
            />
          </button>
        </div>

        {doNotDisturb && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">开始时间</label>
              <input
                type="time"
                value={dndStart}
                onChange={(e) => setDndStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="text-gray-400 pt-6">至</div>
            <div className="flex-1">
              <label className="text-sm text-gray-500 block mb-1">结束时间</label>
              <input
                type="time"
                value={dndEnd}
                onChange={(e) => setDndEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* 通知分组 */}
      <div className="space-y-6">
        {groups.map((group, groupIndex) => (
          <div key={group.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <group.icon className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">{group.title}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <button
                    onClick={() => toggleItem(groupIndex, item.id)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      item.enabled ? "bg-blue-500" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        item.enabled ? "left-7" : "left-1"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
