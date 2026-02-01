/**
 * 空联系人状态组件 - 支持动态主题
 *
 * 职责：渲染未选择联系人时的空状态
 */

import { memo } from 'react';

export const EmptyContact = memo(() => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        {/* 大图标 */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-color)] flex items-center justify-center">
          <svg className="w-12 h-12 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">选择联系人</h3>
        <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
          从左侧列表选择一个好友或群组，查看详细信息和进行操作
        </p>
      </div>
    </div>
  );
});

EmptyContact.displayName = 'EmptyContact';
