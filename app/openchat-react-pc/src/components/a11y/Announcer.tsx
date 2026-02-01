/**
 * 无障碍通知公告组件
 *
 * 职责：为屏幕阅读器提供动态内容更新
 */

import { memo } from 'react';

/**
 * 通知公告组件
 * 用于向屏幕阅读器宣布重要信息
 */
export const Announcer = memo(() => {
  return (
    <>
      {/* 礼貌通知 - 不中断当前阅读 */}
      <div
        id="aria-live-polite"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* 紧急通知 - 立即中断当前阅读 */}
      <div
        id="aria-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
});

Announcer.displayName = 'Announcer';

/**
 * 跳过链接组件
 * 允许键盘用户跳过导航直接访问主内容
 */
export const SkipLink = memo(() => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0EA5E9] focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0EA5E9]"
    >
      跳转到主内容
    </a>
  );
});

SkipLink.displayName = 'SkipLink';

export default Announcer;
