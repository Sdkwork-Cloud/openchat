/**
 * 表情选择器组件
 * 
 * 职责：
 * 1. 显示表情分类（最近使用、默认表情、Emoji）
 * 2. 支持搜索表情
 * 3. 点击选择表情
 * 
 * 标准：通用组件，可在任何模块使用
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';

export interface EmojiItem {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorEl?: HTMLElement | null;
}

// 默认表情数据
const defaultEmojis: EmojiItem[] = [
  // 常用
  { id: '1', emoji: '😀', name: ' grinning', category: '常用' },
  { id: '2', emoji: '😃', name: 'smiley', category: '常用' },
  { id: '3', emoji: '😄', name: 'smile', category: '常用' },
  { id: '4', emoji: '😁', name: 'grin', category: '常用' },
  { id: '5', emoji: '😆', name: 'laughing', category: '常用' },
  { id: '6', emoji: '😅', name: 'sweat_smile', category: '常用' },
  { id: '7', emoji: '🤣', name: 'rofl', category: '常用' },
  { id: '8', emoji: '😂', name: 'joy', category: '常用' },
  { id: '9', emoji: '🙂', name: 'slightly_smiling', category: '常用' },
  { id: '10', emoji: '🙃', name: 'upside_down', category: '常用' },
  { id: '11', emoji: '😉', name: 'wink', category: '常用' },
  { id: '12', emoji: '😊', name: 'blush', category: '常用' },
  { id: '13', emoji: '😇', name: 'innocent', category: '常用' },
  { id: '14', emoji: '🥰', name: 'smiling_face_with_hearts', category: '常用' },
  { id: '15', emoji: '😍', name: 'heart_eyes', category: '常用' },
  { id: '16', emoji: '🤩', name: 'star_struck', category: '常用' },
  { id: '17', emoji: '😘', name: 'kissing_heart', category: '常用' },
  { id: '18', emoji: '😗', name: 'kissing', category: '常用' },
  { id: '19', emoji: '☺️', name: 'relaxed', category: '常用' },
  { id: '20', emoji: '😚', name: 'kissing_closed_eyes', category: '常用' },
  { id: '21', emoji: '😙', name: 'kissing_smiling_eyes', category: '常用' },
  { id: '22', emoji: '🥲', name: 'smiling_face_with_tear', category: '常用' },
  { id: '23', emoji: '😋', name: 'yum', category: '常用' },
  { id: '24', emoji: '😛', name: 'stuck_out_tongue', category: '常用' },
  
  // 情感
  { id: '25', emoji: '😎', name: 'sunglasses', category: '情感' },
  { id: '26', emoji: '🤓', name: 'nerd', category: '情感' },
  { id: '27', emoji: '🧐', name: 'monocle', category: '情感' },
  { id: '28', emoji: '😕', name: 'confused', category: '情感' },
  { id: '29', emoji: '😟', name: 'worried', category: '情感' },
  { id: '30', emoji: '🙁', name: 'slightly_frowning', category: '情感' },
  { id: '31', emoji: '☹️', name: 'frowning', category: '情感' },
  { id: '32', emoji: '😮', name: 'open_mouth', category: '情感' },
  { id: '33', emoji: '😯', name: 'hushed', category: '情感' },
  { id: '34', emoji: '😲', name: 'astonished', category: '情感' },
  { id: '35', emoji: '😳', name: 'flushed', category: '情感' },
  { id: '36', emoji: '🥺', name: 'pleading', category: '情感' },
  { id: '37', emoji: '😦', name: 'frowning_open_mouth', category: '情感' },
  { id: '38', emoji: '😧', name: 'anguished', category: '情感' },
  { id: '39', emoji: '😨', name: 'fearful', category: '情感' },
  { id: '40', emoji: '😰', name: 'anxious', category: '情感' },
  { id: '41', emoji: '😥', name: 'sad_relieved', category: '情感' },
  { id: '42', emoji: '😢', name: 'cry', category: '情感' },
  { id: '43', emoji: '😭', name: 'sob', category: '情感' },
  { id: '44', emoji: '😱', name: 'scream', category: '情感' },
  { id: '45', emoji: '😖', name: 'confounded', category: '情感' },
  { id: '46', emoji: '😣', name: 'persevere', category: '情感' },
  { id: '47', emoji: '😞', name: 'disappointed', category: '情感' },
  { id: '48', emoji: '😓', name: 'sweat', category: '情感' },
  
  // 手势
  { id: '49', emoji: '👍', name: '+1', category: '手势' },
  { id: '50', emoji: '👎', name: '-1', category: '手势' },
  { id: '51', emoji: '👌', name: 'ok_hand', category: '手势' },
  { id: '52', emoji: '🤌', name: 'pinched_fingers', category: '手势' },
  { id: '53', emoji: '🤏', name: 'pinching_hand', category: '手势' },
  { id: '54', emoji: '✌️', name: 'v', category: '手势' },
  { id: '55', emoji: '🤞', name: 'crossed_fingers', category: '手势' },
  { id: '56', emoji: '🤟', name: 'love_you_gesture', category: '手势' },
  { id: '57', emoji: '🤘', name: 'metal', category: '手势' },
  { id: '58', emoji: '🤙', name: 'call_me', category: '手势' },
  { id: '59', emoji: '👈', name: 'point_left', category: '手势' },
  { id: '60', emoji: '👉', name: 'point_right', category: '手势' },
  { id: '61', emoji: '👆', name: 'point_up', category: '手势' },
  { id: '62', emoji: '🖕', name: 'middle_finger', category: '手势' },
  { id: '63', emoji: '👇', name: 'point_down', category: '手势' },
  { id: '64', emoji: '☝️', name: 'point_up_2', category: '手势' },
  { id: '65', emoji: '👋', name: 'wave', category: '手势' },
  { id: '66', emoji: '🤚', name: 'raised_back_of_hand', category: '手势' },
  { id: '67', emoji: '🖐️', name: 'raised_hand', category: '手势' },
  { id: '68', emoji: '✋', name: 'hand', category: '手势' },
  { id: '69', emoji: '🖖', name: 'vulcan_salute', category: '手势' },
  { id: '70', emoji: '👏', name: 'clap', category: '手势' },
  { id: '71', emoji: '🙌', name: 'raised_hands', category: '手势' },
  { id: '72', emoji: '👐', name: 'open_hands', category: '手势' },
  
  // 动物
  { id: '73', emoji: '🐶', name: 'dog', category: '动物' },
  { id: '74', emoji: '🐱', name: 'cat', category: '动物' },
  { id: '75', emoji: '🐭', name: 'mouse', category: '动物' },
  { id: '76', emoji: '🐹', name: 'hamster', category: '动物' },
  { id: '77', emoji: '🐰', name: 'rabbit', category: '动物' },
  { id: '78', emoji: '🦊', name: 'fox', category: '动物' },
  { id: '79', emoji: '🐻', name: 'bear', category: '动物' },
  { id: '80', emoji: '🐼', name: 'panda', category: '动物' },
  { id: '81', emoji: '🐨', name: 'koala', category: '动物' },
  { id: '82', emoji: '🐯', name: 'tiger', category: '动物' },
  { id: '83', emoji: '🦁', name: 'lion', category: '动物' },
  { id: '84', emoji: '🐮', name: 'cow', category: '动物' },
  { id: '85', emoji: '🐷', name: 'pig', category: '动物' },
  { id: '86', emoji: '🐸', name: 'frog', category: '动物' },
  { id: '87', emoji: '🐵', name: 'monkey_face', category: '动物' },
  { id: '88', emoji: '🐔', name: 'chicken', category: '动物' },
  { id: '89', emoji: '🐧', name: 'penguin', category: '动物' },
  { id: '90', emoji: '🐦', name: 'bird', category: '动物' },
  { id: '91', emoji: '🐤', name: 'baby_chick', category: '动物' },
  { id: '92', emoji: '🦆', name: 'duck', category: '动物' },
  { id: '93', emoji: '🦅', name: 'eagle', category: '动物' },
  { id: '94', emoji: '🦉', name: 'owl', category: '动物' },
  { id: '95', emoji: '🦇', name: 'bat', category: '动物' },
  { id: '96', emoji: '🐺', name: 'wolf', category: '动物' },
];

// 获取分类
const categories = Array.from(new Set(defaultEmojis.map(e => e.category)));

/**
 * 表情选择器
 */
export const EmojiPicker = memo(({
  isOpen,
  onClose,
  onSelect,
  anchorEl,
}: EmojiPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('常用');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // 过滤表情
  const filteredEmojis = searchQuery
    ? defaultEmojis.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.emoji.includes(searchQuery)
      )
    : defaultEmojis.filter(e => e.category === activeCategory);

  // 处理选择
  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji);
    // 添加到最近使用
    setRecentEmojis(prev => {
      const newRecent = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 16);
      return newRecent;
    });
    onClose();
  }, [onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute z-50 w-[360px] bg-bg-elevated rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        bottom: anchorEl ? '100%' : 'auto',
        left: anchorEl ? '0' : 'auto',
        marginBottom: anchorEl ? '12px' : '0',
      }}
    >
      {/* 搜索栏 */}
      <div className="p-3 border-b border-border">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索表情..."
            className="w-full h-9 pl-9 pr-3 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 表情网格 */}
      <div className="h-[280px] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
        {searchQuery ? (
          // 搜索结果
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji.id}
                onClick={() => handleSelect(emoji.emoji)}
                className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-bg-hover hover:scale-110 rounded-lg transition-all duration-200"
                title={emoji.name}
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* 最近使用 */}
            {recentEmojis.length > 0 && activeCategory === '常用' && (
              <div className="mb-4">
                <h3 className="text-xs text-text-muted font-bold mb-2 px-1 uppercase tracking-wider">最近使用</h3>
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.map((emoji, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSelect(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-bg-hover hover:scale-110 rounded-lg transition-all duration-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 分类表情 */}
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji) => (
                <button
                  key={emoji.id}
                  onClick={() => handleSelect(emoji.emoji)}
                  className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-bg-hover hover:scale-110 rounded-lg transition-all duration-200"
                  title={emoji.name}
                >
                  {emoji.emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {filteredEmojis.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">未找到表情</span>
          </div>
        )}
      </div>

      {/* 分类标签 */}
      {!searchQuery && (
        <div className="flex items-center px-2 py-2 border-t border-border overflow-x-auto scrollbar-hide bg-bg-secondary/50">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors mr-1 ${
                activeCategory === category
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

EmojiPicker.displayName = 'EmojiPicker';

export default EmojiPicker;
