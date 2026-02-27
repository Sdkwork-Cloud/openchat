import React from 'react';
import { User, Mail, Phone, Shield, Key, ChevronRight } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { cn } from '@/utils/cn';

export const AccountPage: React.FC = () => {
  const { user } = useAuth();

  const sections: {
    title: string;
    items: { icon: typeof User; label: string; value: string; action?: boolean }[];
  }[] = [
    {
      title: '个人信息',
      items: [
        { icon: User, label: '昵称', value: user?.nickname || '未设置' },
        { icon: Mail, label: '邮箱', value: user?.email || '未绑定' },
        { icon: Phone, label: '手机号', value: user?.phone || '未绑定' },
      ],
    },
    {
      title: '安全设置',
      items: [
        { icon: Key, label: '修改密码', value: '', action: true },
        { icon: Shield, label: '两步验证', value: '未开启', action: true },
      ],
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">账号信息</h1>
      
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{section.title}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className="text-gray-500">{item.value}</span>
                    )}
                    {item.action && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
