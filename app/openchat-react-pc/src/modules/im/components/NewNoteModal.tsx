/**
 * 新建笔记弹窗组件 - 使用通用 Modal
 *
 * 职责：
 * 1. 创建文本笔记
 * 2. 支持 Markdown 编辑
 * 3. 保存笔记
 */

import { useState, useCallback } from 'react';
import { Modal, ModalButtonGroup } from '@/components/ui/Modal';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewNoteModal({ isOpen, onClose, onSuccess }: NewNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // 保存笔记
  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      return;
    }

    setIsSaving(true);

    // 模拟保存延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSaving(false);
    setSaveSuccess(true);

    // 延迟关闭
    setTimeout(() => {
      onSuccess?.();
      handleClose();
    }, 1500);
  };

  // 关闭弹窗并重置状态
  const handleClose = () => {
    setTitle('');
    setContent('');
    setSaveSuccess(false);
    setActiveTab('edit');
    onClose();
  };

  // 简单的 Markdown 预览
  const renderPreview = useCallback(() => {
    if (!content) return <p className="text-[var(--text-muted)] italic">暂无内容</p>;

    // 简单的 Markdown 转换
    let html = content
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-[var(--text-primary)] mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-[var(--text-primary)] mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[var(--text-primary)] mb-4">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="text-[var(--text-primary)]">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="text-[var(--text-secondary)]">$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm text-[var(--ai-primary)]">$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-[var(--bg-tertiary)] p-3 rounded-md overflow-x-auto my-3"><code class="text-sm text-[var(--text-secondary)]">$1</code></pre>')
      .replace(/^- (.*$)/gim, '<li class="text-[var(--text-secondary)] ml-4">$1</li>')
      .replace(/\n/gim, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }, [content]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新建笔记"
      size="xl"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-[var(--text-muted)]">
            {saveSuccess && (
              <span className="text-[var(--ai-success)] flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存成功
              </span>
            )}
          </div>
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleSave}
            confirmText={saveSuccess ? '已保存' : '保存笔记'}
            confirmVariant="primary"
            isLoading={isSaving}
            disabled={!title.trim() && !content.trim()}
          />
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* 编辑/预览切换 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex bg-[var(--bg-tertiary)] rounded-md p-0.5">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === 'edit'
                  ? 'bg-[var(--ai-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              编辑
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === 'preview'
                  ? 'bg-[var(--ai-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              预览
            </button>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {content.length} 字符
          </span>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'edit' ? (
            <div className="flex flex-col h-full p-5 space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入笔记标题..."
                  className="w-full h-10 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] transition-colors"
                />
              </div>

              {/* 内容 */}
              <div className="flex-1">
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  内容
                  <span className="text-xs text-[var(--text-muted)] ml-2">支持 Markdown 格式</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入笔记内容...\n\n支持 Markdown 格式：\n# 标题\n## 二级标题\n**粗体**\n*斜体*\n`代码`\n```代码块```\n- 列表项"
                  className="w-full h-full min-h-[200px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] transition-colors resize-none font-mono leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="h-full p-5 overflow-y-auto">
              {/* 预览标题 */}
              {title && (
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{title}</h1>
              )}
              {/* 预览内容 */}
              <div className="text-[var(--text-secondary)] leading-relaxed">
                {renderPreview()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default NewNoteModal;
