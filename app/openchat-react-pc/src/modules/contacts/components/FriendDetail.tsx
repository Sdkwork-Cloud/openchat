/**
 * 好友详情组件 - 支持动态主题
 *
 * 职责：渲染好友详细信息
 * 设计参考：微信PC版详情页
 */

import { memo } from 'react';
import type { Friend } from '../entities/contact.entity';
import type { CallType } from '../../rtc/entities/rtc.entity';

interface FriendDetailProps {
  friend: Friend;
  onCall?: (callType: CallType) => void;
}

export const FriendDetail = memo(({ friend, onCall }: FriendDetailProps) => {
  const handleAudioCall = () => {
    onCall?.('audio');
  };

  const handleVideoCall = () => {
    onCall?.('video');
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
      {/* 头部 */}
      <div className="h-[60px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-6">
        <h2 className="font-medium text-[var(--text-primary)] text-base">{friend.name}</h2>
      </div>

      {/* 详情内容 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 顶部大卡片 - 头像和基本信息 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-8">
            <div className="flex items-start space-x-6">
              {/* 大头像 */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] flex items-center justify-center text-white font-semibold text-3xl flex-shrink-0 shadow-[var(--shadow-glow)]">
                {friend.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{friend.name}</h3>
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${friend.isOnline ? 'bg-[var(--ai-primary)]' : 'bg-[var(--text-muted)]'}`}></div>
                    <span className="text-sm text-[var(--text-tertiary)]">{friend.status || '离线'}</span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">OpenChat号: {friend.id}</span>
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-3 mt-5">
                  <button className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-[var(--shadow-sm)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>发消息</span>
                  </button>
                  <button
                    onClick={handleAudioCall}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>语音通话</span>
                  </button>
                  <button
                    onClick={handleVideoCall}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>视频通话</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 详细信息卡片 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">个人信息</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <span className="text-sm text-[var(--text-muted)] w-24 flex-shrink-0">昵称</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[var(--text-muted)] w-24 flex-shrink-0">备注名</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-[var(--text-muted)] w-24 flex-shrink-0">地区</span>
                <span className="text-sm text-[var(--text-primary)]">{friend.region || '中国'}</span>
              </div>
              <div className="flex items-start">
                <span className="text-sm text-[var(--text-muted)] w-24 flex-shrink-0">个性签名</span>
                <span className="text-sm text-[var(--text-primary)] flex-1">{friend.signature || '生活不止眼前的苟且，还有诗和远方'}</span>
              </div>
            </div>
          </div>

          {/* 更多操作 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">更多</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-hover)] transition-colors">
                <span className="text-sm text-[var(--text-primary)]">朋友圈</span>
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-hover)] transition-colors">
                <span className="text-sm text-[var(--text-primary)]">共同群聊</span>
                <div className="flex items-center">
                  <span className="text-sm text-[var(--text-muted)] mr-2">3个</span>
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-hover)] transition-colors">
                <span className="text-sm text-[var(--ai-error)]">删除好友</span>
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FriendDetail.displayName = 'FriendDetail';
