import React, { useState } from 'react';
import { Shield, Eye, UserPlus, EyeOff, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

type VisibilityOption = 'everyone' | 'contacts' | 'nobody';

interface PrivacyItem {
  id: string;
  label: string;
  description: string;
  value: VisibilityOption;
}

export const PrivacyPage: React.FC = () => {
  const [items, setItems] = useState<PrivacyItem[]>([
    { id: 'online_status', label: '在线状态', description: '谁可以看到您的在线状态', value: 'contacts' },
    { id: 'last_seen', label: '最后上线时间', description: '谁可以看到您的最后上线时间', value: 'contacts' },
    { id: 'profile_photo', label: '头像', description: '谁可以看到您的头像', value: 'everyone' },
    { id: 'phone_number', label: '手机号', description: '谁可以看到您的手机号', value: 'contacts' },
  ]);

  const [addBy, setAddBy] = useState({
    phone: true,
    username: true,
    qrcode: true,
  });

  const [readReceipts, setReadReceipts] = useState(true);
  const [screenshotNotification, setScreenshotNotification] = useState(false);

  const visibilityOptions: { value: VisibilityOption; label: string }[] = [
    { value: 'everyone', label: '所有人' },
    { value: 'contacts', label: '联系人' },
    { value: 'nobody', label: '无人' },
  ];

  const updateItem = (id: string, value: VisibilityOption) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, value } : item))
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Shield className="w-7 h-7 text-blue-500" />
        隐私设置
      </h1>

      {/* 可见性设置 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-500" />
            可见性
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {visibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateItem(item.id, option.value)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                      item.value === option.value
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 添加方式 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gray-500" />
            添加方式
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { id: 'phone', label: '通过手机号添加', description: '允许他人通过手机号找到您' },
            { id: 'username', label: '通过用户名添加', description: '允许他人通过用户名找到您' },
            { id: 'qrcode', label: '通过二维码添加', description: '允许他人扫描二维码添加您' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <button
                onClick={() => setAddBy((prev) => ({ ...prev, [item.id]: !prev[item.id as keyof typeof addBy] }))}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  addBy[item.id as keyof typeof addBy] ? 'bg-blue-500' : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    addBy[item.id as keyof typeof addBy] ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 其他隐私设置 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium text-gray-900">已读回执</p>
              <p className="text-sm text-gray-500">发送已读回执给联系人</p>
            </div>
            <button
              onClick={() => setReadReceipts(!readReceipts)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                readReceipts ? 'bg-blue-500' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  readReceipts ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium text-gray-900">截屏通知</p>
              <p className="text-sm text-gray-500">当有人截屏聊天时通知我</p>
            </div>
            <button
              onClick={() => setScreenshotNotification(!screenshotNotification)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                screenshotNotification ? 'bg-blue-500' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  screenshotNotification ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
