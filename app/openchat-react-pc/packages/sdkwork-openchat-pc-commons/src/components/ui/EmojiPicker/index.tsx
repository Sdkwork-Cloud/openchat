/**
 * 琛ㄦ儏閫夋嫨鍣ㄧ粍浠? * 
 * 鑱岃矗锛? * 1. 鏄剧ず琛ㄦ儏鍒嗙被锛堟渶杩戜娇鐢ㄣ€侀粯璁よ〃鎯呫€丒moji锛? * 2. 鏀寔鎼滅储琛ㄦ儏
 * 3. 鐐瑰嚮閫夋嫨琛ㄦ儏
 * 
 * 鏍囧噯锛氶€氱敤缁勪欢锛屽彲鍦ㄤ换浣曟ā鍧椾娇鐢? */

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

// 榛樿琛ㄦ儏鏁版嵁
const defaultEmojis: EmojiItem[] = [
  // 甯哥敤
  { id: '1', emoji: '馃榾', name: ' grinning', category: '甯哥敤' },
  { id: '2', emoji: '馃槂', name: 'smiley', category: '甯哥敤' },
  { id: '3', emoji: '馃槃', name: 'smile', category: '甯哥敤' },
  { id: '4', emoji: '馃榿', name: 'grin', category: '甯哥敤' },
  { id: '5', emoji: '馃槅', name: 'laughing', category: '甯哥敤' },
  { id: '6', emoji: '馃槄', name: 'sweat_smile', category: '甯哥敤' },
  { id: '7', emoji: '馃ぃ', name: 'rofl', category: '甯哥敤' },
  { id: '8', emoji: '馃槀', name: 'joy', category: '甯哥敤' },
  { id: '9', emoji: '馃檪', name: 'slightly_smiling', category: '甯哥敤' },
  { id: '10', emoji: '馃檭', name: 'upside_down', category: '甯哥敤' },
  { id: '11', emoji: '馃槈', name: 'wink', category: '甯哥敤' },
  { id: '12', emoji: '馃槉', name: 'blush', category: '甯哥敤' },
  { id: '13', emoji: '馃槆', name: 'innocent', category: '甯哥敤' },
  { id: '14', emoji: '馃グ', name: 'smiling_face_with_hearts', category: '甯哥敤' },
  { id: '15', emoji: '馃槏', name: 'heart_eyes', category: '甯哥敤' },
  { id: '16', emoji: '馃ぉ', name: 'star_struck', category: '甯哥敤' },
  { id: '17', emoji: '馃槝', name: 'kissing_heart', category: '甯哥敤' },
  { id: '18', emoji: '馃槜', name: 'kissing', category: '甯哥敤' },
  { id: '19', emoji: '鈽猴笍', name: 'relaxed', category: '甯哥敤' },
  { id: '20', emoji: '馃槡', name: 'kissing_closed_eyes', category: '甯哥敤' },
  { id: '21', emoji: '馃槞', name: 'kissing_smiling_eyes', category: '甯哥敤' },
  { id: '22', emoji: '馃ゲ', name: 'smiling_face_with_tear', category: '甯哥敤' },
  { id: '23', emoji: '馃構', name: 'yum', category: '甯哥敤' },
  { id: '24', emoji: '馃槢', name: 'stuck_out_tongue', category: '甯哥敤' },
  
  // 鎯呮劅
  { id: '25', emoji: '馃槑', name: 'sunglasses', category: '鎯呮劅' },
  { id: '26', emoji: '馃', name: 'nerd', category: '鎯呮劅' },
  { id: '27', emoji: '馃', name: 'monocle', category: '鎯呮劅' },
  { id: '28', emoji: '馃槙', name: 'confused', category: '鎯呮劅' },
  { id: '29', emoji: '馃槦', name: 'worried', category: '鎯呮劅' },
  { id: '30', emoji: '馃檨', name: 'slightly_frowning', category: '鎯呮劅' },
  { id: '31', emoji: '鈽癸笍', name: 'frowning', category: '鎯呮劅' },
  { id: '32', emoji: '馃槷', name: 'open_mouth', category: '鎯呮劅' },
  { id: '33', emoji: '馃槸', name: 'hushed', category: '鎯呮劅' },
  { id: '34', emoji: '馃槻', name: 'astonished', category: '鎯呮劅' },
  { id: '35', emoji: '馃槼', name: 'flushed', category: '鎯呮劅' },
  { id: '36', emoji: '馃ズ', name: 'pleading', category: '鎯呮劅' },
  { id: '37', emoji: '馃槮', name: 'frowning_open_mouth', category: '鎯呮劅' },
  { id: '38', emoji: '馃槯', name: 'anguished', category: '鎯呮劅' },
  { id: '39', emoji: '馃槰', name: 'fearful', category: '鎯呮劅' },
  { id: '40', emoji: '馃槹', name: 'anxious', category: '鎯呮劅' },
  { id: '41', emoji: '馃槬', name: 'sad_relieved', category: '鎯呮劅' },
  { id: '42', emoji: '馃槩', name: 'cry', category: '鎯呮劅' },
  { id: '43', emoji: '馃槶', name: 'sob', category: '鎯呮劅' },
  { id: '44', emoji: '馃槺', name: 'scream', category: '鎯呮劅' },
  { id: '45', emoji: '馃槚', name: 'confounded', category: '鎯呮劅' },
  { id: '46', emoji: '馃槪', name: 'persevere', category: '鎯呮劅' },
  { id: '47', emoji: '馃槥', name: 'disappointed', category: '鎯呮劅' },
  { id: '48', emoji: '馃槗', name: 'sweat', category: '鎯呮劅' },
  
  // 鎵嬪娍
  { id: '49', emoji: '馃憤', name: '+1', category: '鎵嬪娍' },
  { id: '50', emoji: '馃憥', name: '-1', category: '鎵嬪娍' },
  { id: '51', emoji: '馃憣', name: 'ok_hand', category: '鎵嬪娍' },
  { id: '52', emoji: '馃', name: 'pinched_fingers', category: '鎵嬪娍' },
  { id: '53', emoji: '馃', name: 'pinching_hand', category: '鎵嬪娍' },
  { id: '54', emoji: '鉁岋笍', name: 'v', category: '鎵嬪娍' },
  { id: '55', emoji: '馃', name: 'crossed_fingers', category: '鎵嬪娍' },
  { id: '56', emoji: '馃', name: 'love_you_gesture', category: '鎵嬪娍' },
  { id: '57', emoji: '馃', name: 'metal', category: '鎵嬪娍' },
  { id: '58', emoji: '馃', name: 'call_me', category: '鎵嬪娍' },
  { id: '59', emoji: '馃憟', name: 'point_left', category: '鎵嬪娍' },
  { id: '60', emoji: '馃憠', name: 'point_right', category: '鎵嬪娍' },
  { id: '61', emoji: '馃憜', name: 'point_up', category: '鎵嬪娍' },
  { id: '62', emoji: '馃枙', name: 'middle_finger', category: '鎵嬪娍' },
  { id: '63', emoji: '馃憞', name: 'point_down', category: '鎵嬪娍' },
  { id: '64', emoji: '鈽濓笍', name: 'point_up_2', category: '鎵嬪娍' },
  { id: '65', emoji: '馃憢', name: 'wave', category: '鎵嬪娍' },
  { id: '66', emoji: '馃', name: 'raised_back_of_hand', category: '鎵嬪娍' },
  { id: '67', emoji: '馃枑锔?, name: 'raised_hand', category: '鎵嬪娍' },
  { id: '68', emoji: '鉁?, name: 'hand', category: '鎵嬪娍' },
  { id: '69', emoji: '馃枛', name: 'vulcan_salute', category: '鎵嬪娍' },
  { id: '70', emoji: '馃憦', name: 'clap', category: '鎵嬪娍' },
  { id: '71', emoji: '馃檶', name: 'raised_hands', category: '鎵嬪娍' },
  { id: '72', emoji: '馃憪', name: 'open_hands', category: '鎵嬪娍' },
  
  // 鍔ㄧ墿
  { id: '73', emoji: '馃惗', name: 'dog', category: '鍔ㄧ墿' },
  { id: '74', emoji: '馃惐', name: 'cat', category: '鍔ㄧ墿' },
  { id: '75', emoji: '馃惌', name: 'mouse', category: '鍔ㄧ墿' },
  { id: '76', emoji: '馃惞', name: 'hamster', category: '鍔ㄧ墿' },
  { id: '77', emoji: '馃惏', name: 'rabbit', category: '鍔ㄧ墿' },
  { id: '78', emoji: '馃', name: 'fox', category: '鍔ㄧ墿' },
  { id: '79', emoji: '馃惢', name: 'bear', category: '鍔ㄧ墿' },
  { id: '80', emoji: '馃惣', name: 'panda', category: '鍔ㄧ墿' },
  { id: '81', emoji: '馃惃', name: 'koala', category: '鍔ㄧ墿' },
  { id: '82', emoji: '馃惎', name: 'tiger', category: '鍔ㄧ墿' },
  { id: '83', emoji: '馃', name: 'lion', category: '鍔ㄧ墿' },
  { id: '84', emoji: '馃惍', name: 'cow', category: '鍔ㄧ墿' },
  { id: '85', emoji: '馃惙', name: 'pig', category: '鍔ㄧ墿' },
  { id: '86', emoji: '馃惛', name: 'frog', category: '鍔ㄧ墿' },
  { id: '87', emoji: '馃惖', name: 'monkey_face', category: '鍔ㄧ墿' },
  { id: '88', emoji: '馃悢', name: 'chicken', category: '鍔ㄧ墿' },
  { id: '89', emoji: '馃惂', name: 'penguin', category: '鍔ㄧ墿' },
  { id: '90', emoji: '馃惁', name: 'bird', category: '鍔ㄧ墿' },
  { id: '91', emoji: '馃悿', name: 'baby_chick', category: '鍔ㄧ墿' },
  { id: '92', emoji: '馃', name: 'duck', category: '鍔ㄧ墿' },
  { id: '93', emoji: '馃', name: 'eagle', category: '鍔ㄧ墿' },
  { id: '94', emoji: '馃', name: 'owl', category: '鍔ㄧ墿' },
  { id: '95', emoji: '馃', name: 'bat', category: '鍔ㄧ墿' },
  { id: '96', emoji: '馃惡', name: 'wolf', category: '鍔ㄧ墿' },
];

// 鑾峰彇鍒嗙被
const categories = Array.from(new Set(defaultEmojis.map(e => e.category)));

/**
 * 琛ㄦ儏閫夋嫨鍣? */
export const EmojiPicker = memo(({
  isOpen,
  onClose,
  onSelect,
  anchorEl,
}: EmojiPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('甯哥敤');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 鐐瑰嚮澶栭儴鍏抽棴
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

  // 杩囨护琛ㄦ儏
  const filteredEmojis = searchQuery
    ? defaultEmojis.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.emoji.includes(searchQuery)
      )
    : defaultEmojis.filter(e => e.category === activeCategory);

  // 澶勭悊閫夋嫨
  const handleSelect = useCallback((emoji: string) => {
    onSelect(emoji);
    // 娣诲姞鍒版渶杩戜娇鐢?    setRecentEmojis(prev => {
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
      {/* 鎼滅储鏍?*/}
      <div className="p-3 border-b border-border">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="鎼滅储琛ㄦ儏..."
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

      {/* 琛ㄦ儏缃戞牸 */}
      <div className="h-[280px] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted">
        {searchQuery ? (
          // 鎼滅储缁撴灉
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
            {/* 鏈€杩戜娇鐢?*/}
            {recentEmojis.length > 0 && activeCategory === '甯哥敤' && (
              <div className="mb-4">
                <h3 className="text-xs text-text-muted font-bold mb-2 px-1 uppercase tracking-wider">鏈€杩戜娇鐢?/h3>
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

            {/* 鍒嗙被琛ㄦ儏 */}
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
            <span className="text-sm">鏈壘鍒拌〃鎯?/span>
          </div>
        )}
      </div>

      {/* 鍒嗙被鏍囩 */}
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

