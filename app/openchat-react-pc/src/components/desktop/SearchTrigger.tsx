import React, { useState, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { SearchPalette } from '../../modules/search';
import { cn } from '../../lib/utils';

export const SearchTrigger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-muted/50 hover:bg-muted border border-border/50",
          "text-muted-foreground hover:text-foreground",
          "transition-colors duration-200"
        )}
      >
        <Search className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">搜索</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background rounded border ml-2">
          <Command className="w-3 h-3" />
          <span>K</span>
        </kbd>
      </button>

      {/* Search Palette */}
      <SearchPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
