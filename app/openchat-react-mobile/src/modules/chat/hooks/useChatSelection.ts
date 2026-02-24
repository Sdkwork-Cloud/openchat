
import { useState, useCallback } from 'react';
import { Message } from '../types';
import { ChatService } from '../services/ChatService';
import { Toast } from '../../../components/Toast';
import { navigate } from '../../../router';

export const useChatSelection = (sessionId: string | undefined) => {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const enterSelectionMode = useCallback((initialId?: string) => {
        setSelectionMode(true);
        if (initialId) setSelectedIds(new Set([initialId]));
    }, []);

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const deleteSelected = async () => {
        if (!sessionId || selectedIds.size === 0) return;
        if (window.confirm(`确定删除选中的 ${selectedIds.size} 条消息?`)) {
            await ChatService.deleteMessages(sessionId, Array.from(selectedIds));
            exitSelectionMode();
            Toast.success('已删除');
            // Ideally force refresh here or rely on store updates
            window.location.reload(); // Simple refresh for now
        }
    };

    const forwardSelected = () => {
        if (selectedIds.size === 0) return;
        sessionStorage.setItem('forward_content', `[转发] 聊天记录 (${selectedIds.size}条)`);
        navigate('/contacts?mode=select&action=forward');
        exitSelectionMode();
    };

    return {
        selectionMode,
        selectedIds,
        toggleSelection,
        enterSelectionMode,
        exitSelectionMode,
        deleteSelected,
        forwardSelected
    };
};
