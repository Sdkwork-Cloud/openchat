/**
 * 群组详情组件 - 支持动态主题
 *
 * 职责：渲染群组详细信息
 * 设计参考：微信PC版群详情页
 */

import { memo } from 'react';
import type { Group } from '../entities/contact.entity';

interface GroupDetailProps {
  group: Group;
}

// 模拟群成员
const mockMembers = [
  { id: '1', name: '张三', avatar: '张', isAdmin: true },
  { id: '2', name: '李四', avatar: '李', isAdmin: false },
  { id: '3', name: '王五', avatar: '王', isAdmin: false },
  { id: '4', name: '赵六', avatar: '赵', isAdmin: false },
  { id: '5', name: '钱七', avatar: '钱', isAdmin: false },
  { id: '6', name: '孙八', avatar: '孙', isAdmin: false },
  { id: '7', name: '周九', avatar: '周', isAdmin: false },
  { id: '8', name: '吴十', avatar: '吴', isAdmin: false },
];

export const GroupDetail = memo(({ group }: GroupDetailProps) => {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
      {/* 头部 */}
      <div className="h-[60px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-6">
        <h2 className="font-medium text-[var(--text-primary)] text-base">{group.name}</h2>
      </div>

      {/* 详情内容 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 顶部大卡片 - 群头像和基本信息 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-8">
            <div className="flex items-start space-x-6">
              {/* 大头像 */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--ai-purple)] to-[var(--ai-purple-hover)] flex items-center justify-center text-white font-semibold text-3xl flex-shrink-0 shadow-[var(--shadow-glow)]">
                {group.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{group.name}</h3>
                <div className="flex items-center mt-2 space-x-4">
                  <span className="text-sm text-[var(--text-muted)]">{group.memberCount} 人</span>
                  <span className="text-sm text-[var(--text-muted)]">创建于 2024-01-15</span>
                </div>
                {group.description && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-3">{group.description}</p>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-3 mt-5">
                  <button className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white text-sm font-medium rounded-xl transition-colors shadow-[var(--shadow-sm)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>发消息</span>
                  </button>
                  <button className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium rounded-xl transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>邀请成员</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 群成员卡片 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">群成员</h4>
              <span className="text-sm text-[var(--text-muted)]">{group.memberCount} 人</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-8 gap-4">
                {mockMembers.map((member) => (
                  <div key={member.id} className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] flex items-center justify-center text-white font-semibold text-sm">
                        {member.avatar}
                      </div>
                      {member.isAdmin && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--ai-warning)] rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] mt-2 truncate w-full text-center">{member.name}</span>
                  </div>
                ))}
                {/* 添加成员按钮 */}
                <button className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[var(--text-muted)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] mt-2">添加</span>
                </button>
              </div>
              <button className="w-full mt-4 py-2 text-sm text-[var(--ai-primary)] hover:bg-[var(--ai-primary-soft)] rounded-lg transition-colors">
                查看全部成员
              </button>
            </div>
          </div>

          {/* 群设置卡片 */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">群设置</h4>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-[var(--text-primary)]">群聊名称</span>
                <div className="flex items-center">
                  <span className="text-sm text-[var(--text-muted)] mr-2">{group.name}</span>
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-[var(--text-primary)]">群公告</span>
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-[var(--text-primary)]">我在群里的昵称</span>
                <div className="flex items-center">
                  <span className="text-sm text-[var(--text-muted)] mr-2">我</span>
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-[var(--text-primary)]">消息免打扰</span>
                <button className="relative w-11 h-6 rounded-full bg-[var(--bg-tertiary)] transition-colors">
                  <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                </button>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-[var(--text-primary)]">置顶聊天</span>
                <button className="relative w-11 h-6 rounded-full bg-[var(--bg-tertiary)] transition-colors">
                  <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* 退出群聊 */}
          <button className="w-full py-3 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.15)] text-[var(--ai-error)] text-sm font-medium rounded-xl transition-colors">
            退出群聊
          </button>
        </div>
      </div>
    </div>
  );
});

GroupDetail.displayName = 'GroupDetail';
