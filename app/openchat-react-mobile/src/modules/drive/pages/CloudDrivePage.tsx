import React, { useState, useRef, useMemo } from 'react';
import { navigate, navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { FileService, FileNode, FileType } from '../services/FileService';
import { ChatService } from '../../chat/services/ChatService';
import { formatBytes } from '../../../utils/algorithms';
import { Toast } from '../../../components/Toast';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Platform } from '../../../platform';
import { SmartImage } from '../../../components/SmartImage/SmartImage';
import { useLongPress } from '../../../hooks/useLongPress';
import { SearchInput } from '../../../components/SearchInput/SearchInput';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Dialog } from '../../../components/Dialog';
import { Input } from '../../../components/Input/Input';
import { useLiveQuery } from '../../../core/hooks';
import { StateView } from '../../../components/StateView/StateView';
import { Empty } from '../../../components/Empty/Empty';

// --- Icons & Visuals ---

const getFileIconConfig = (type: FileType) => {
    switch(type) {
        case 'folder': return { icon: '📁', color: '#FFCA28', bg: 'rgba(255, 202, 40, 0.15)' };
        case 'image': return { icon: '🖼️', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)' };
        case 'video': return { icon: '🎬', color: '#F44336', bg: 'rgba(244, 67, 54, 0.15)' };
        case 'audio': return { icon: '🎵', color: '#E91E63', bg: 'rgba(233, 30, 99, 0.15)' };
        case 'pdf': return { icon: '📄', color: '#FF5722', bg: 'rgba(255, 87, 34, 0.15)' };
        case 'xls': return { icon: '📊', color: '#4CAF50', bg: 'rgba(76, 175, 80, 0.15)' };
        case 'doc': return { icon: '📝', color: '#2196F3', bg: 'rgba(33, 150, 243, 0.15)' };
        case 'zip': return { icon: '📦', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.15)' };
        default: return { icon: '📄', color: '#9E9E9E', bg: 'rgba(158, 158, 158, 0.15)' };
    }
};

const FileIcon: React.FC<{ type: FileType, url?: string, size?: number }> = ({ type, url, size = 44 }) => {
    const config = getFileIconConfig(type);
    
    if (type === 'image' && url) {
        return (
            <SmartImage 
                src={url} 
                containerStyle={{ width: `${size}px`, height: `${size}px` }} 
                radius={8} 
                preview={false} 
            />
        );
    }
    
    return (
        <div style={{ 
            width: `${size}px`, height: `${size}px`, borderRadius: '8px', 
            background: config.bg, color: config.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: `${size * 0.55}px` 
        }}>
            {config.icon}
        </div>
    );
};

interface FileItemProps { 
    file: FileNode; 
    onClick: () => void; 
    onLongPress: () => void; 
    selected: boolean; 
    selectionMode: boolean; 
    onMore: (e: React.MouseEvent) => void;
}

// --- List Item Component ---
const FileListItem: React.FC<FileItemProps> = ({ 
    file, onClick, onLongPress, selected, selectionMode, onMore
}) => {
    const longPress = useLongPress({ onLongPress, onClick });
    const formattedDate = new Date(file.updateTime).toLocaleDateString();
    
    return (
        <div 
            {...longPress}
            style={{ 
                padding: '12px 16px', background: selected ? 'var(--bg-cell-active)' : 'var(--bg-card)', 
                display: 'flex', alignItems: 'center', gap: '12px',
                borderBottom: '0.5px solid var(--border-color)',
                cursor: 'pointer', transition: 'background 0.2s'
            }}
        >
            {selectionMode && <Checkbox checked={selected} />}
            <FileIcon type={file.type} url={file.url} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {file.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formattedDate} {file.size ? `· ${formatBytes(file.size)}` : ''}
                </div>
            </div>
            {!selectionMode && (
                <div 
                    onClick={(e) => { e.stopPropagation(); onMore(e); }}
                    style={{ padding: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </div>
            )}
        </div>
    );
};

// --- Grid Item Component ---
const FileGridItem: React.FC<FileItemProps> = ({ 
    file, onClick, onLongPress, selected, selectionMode, onMore
}) => {
    const longPress = useLongPress({ onLongPress, onClick });

    return (
        <div 
            {...longPress}
            style={{ 
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 4px', borderRadius: '12px',
                background: selected ? 'var(--bg-cell-active)' : 'transparent',
                cursor: 'pointer', transition: 'transform 0.1s'
            }}
        >
            {selectionMode && (
                <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10 }}>
                    <Checkbox checked={selected} />
                </div>
            )}
            <div style={{ marginBottom: '8px', position: 'relative' }}>
                <FileIcon type={file.type} url={file.url} size={64} />
            </div>
            <div style={{ 
                fontSize: '12px', color: 'var(--text-primary)', textAlign: 'center', 
                width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', 
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                lineHeight: 1.3, height: '32px'
            }}>
                {file.name}
            </div>
        </div>
    );
};

// --- Sort & View Options ---
type SortField = 'name' | 'time' | 'size';
type ViewMode = 'list' | 'grid';

const FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'folder', label: '文件夹' },
    { id: 'doc', label: '文档' },
    { id: 'media', label: '媒体' },
];

export const CloudDrivePage: React.FC = () => {
    const query = useQueryParams();
    const folderId = query.get('folderId') || null;
    const sessionId = query.get('sessionId') || null; 
    
    // Live Query for Files
    const { data: fileList, viewStatus, refresh } = useLiveQuery(
        FileService,
        () => FileService.getFilesByParent(folderId),
        { deps: [folderId] }
    );
    
    // Live Query for Breadcrumbs (Usually fast enough to fetch, or could be passed via state, but query keeps it sync)
    const { data: breadcrumbs = [] } = useLiveQuery(
        FileService,
        async () => {
            const res = await FileService.getBreadcrumbs(folderId);
            return { success: true, data: res };
        },
        { deps: [folderId] }
    );
    
    const files = fileList || [];
    const title = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : (sessionId ? '发送文件' : '我的云盘');
    
    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortField, setSortField] = useState<SortField>('time');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    
    // Sheets & Dialogs
    const [showMenu, setShowMenu] = useState(false);
    const [showSortSheet, setShowSortSheet] = useState(false);
    const [activeFile, setActiveFile] = useState<FileNode | null>(null); 
    
    // Dialogs
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [showFolderDialog, setShowFolderDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [nameInput, setNameInput] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const updatePath = (fid: string | null) => {
        let p = '/drive';
        const params = new URLSearchParams();
        if (fid) params.append('folderId', fid);
        if (sessionId) params.append('sessionId', sessionId);
        const str = params.toString();
        return str ? `${p}?${str}` : p;
    };

    // --- Actions ---

    const handleBack = () => {
        if (selectionMode) {
            setSelectionMode(false);
            setSelectedIds(new Set());
        } else {
            if (breadcrumbs.length > 0) {
                if (breadcrumbs.length >= 2) {
                     const parent = breadcrumbs[breadcrumbs.length - 2];
                     navigate(updatePath(parent.id));
                } else {
                     navigate(updatePath(null)); 
                }
            } else {
                navigateBack(sessionId ? `/chat?id=${sessionId}` : '/');
            }
        }
    };

    const handleBreadcrumbClick = (file: FileNode | null) => {
        navigate(updatePath(file ? file.id : null));
    };

    const handleItemClick = (file: FileNode) => {
        if (selectionMode) {
            toggleSelection(file.id);
            return;
        }

        if (file.type === 'folder') {
            navigate(updatePath(file.id));
        } else {
            if (sessionId) {
                if (window.confirm(`确定发送 "${file.name}"?`)) {
                    const content = `📂 [文件] ${file.name} | ${formatBytes(file.size || 0)} | ${file.type}`;
                    ChatService.addMessage(sessionId, { role: 'user', content });
                    navigateBack(`/chat?id=${sessionId}`);
                }
            } else {
                if (file.type === 'image' && file.url) {
                    Toast.info(`打开文件: ${file.name}`);
                } else {
                    Toast.info(`预览文件: ${file.name}`);
                }
            }
        }
    };

    const handleLongPress = (file: FileNode) => {
        if (!selectionMode) {
            Platform.device.vibrate(20);
            setSelectionMode(true);
            setSelectedIds(new Set([file.id]));
        }
    };

    const handleMoreClick = (e: React.MouseEvent, file: FileNode) => {
        e.stopPropagation();
        setActiveFile(file);
        setNameInput(file.name);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === files.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(files.map(f => f.id)));
        }
    };

    const handleDelete = async () => {
        setShowDeleteDialog(false);
        const ids = selectionMode ? Array.from(selectedIds) : (activeFile ? [activeFile.id] : []);
        
        if (ids.length === 0) return;

        await FileService.deleteFiles(ids);
        Toast.success('已删除');
        
        setSelectionMode(false);
        setSelectedIds(new Set());
        setActiveFile(null);
        // refresh handled by useLiveQuery subscription
    };

    const handleCreateFolder = async () => {
        if (nameInput.trim()) {
            await FileService.createFolder(folderId, nameInput.trim());
            setShowFolderDialog(false);
            setNameInput('');
        }
    };

    const handleRename = async () => {
        if (activeFile && nameInput.trim() && nameInput.trim() !== activeFile.name) {
            await FileService.renameFile(activeFile.id, nameInput.trim());
            Toast.success('重命名成功');
            setShowRenameDialog(false);
            setActiveFile(null);
        } else {
            setShowRenameDialog(false);
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        Toast.loading('上传中...');
        let type: FileType = 'unknown';
        if (file.type.startsWith('image')) type = 'image';
        else if (file.type.startsWith('video')) type = 'video';
        else if (file.type.startsWith('audio')) type = 'audio';
        else if (file.name.endsWith('.pdf')) type = 'pdf';
        
        FileService.uploadFile(folderId, {
            name: file.name,
            size: file.size,
            type: type,
            url: URL.createObjectURL(file)
        }).then(() => {
            Toast.success('上传成功');
        });
        setShowMenu(false);
    };

    // --- Sorting & Filtering ---
    const sortedFiles = useMemo(() => {
        let result = [...files];
        
        if (searchQuery) {
            result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (activeFilter !== 'all') {
            if (activeFilter === 'folder') {
                result = result.filter(f => f.type === 'folder');
            } else if (activeFilter === 'doc') {
                result = result.filter(f => ['pdf','doc','xls','ppt','txt','unknown'].includes(f.type));
            } else if (activeFilter === 'media') {
                result = result.filter(f => ['image','video','audio'].includes(f.type));
            }
        }

        result.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            
            if (sortField === 'name') return a.name.localeCompare(b.name);
            if (sortField === 'size') return (b.size || 0) - (a.size || 0);
            return b.updateTime - a.updateTime; 
        });

        return result;
    }, [files, searchQuery, sortField, activeFilter]);


    // --- Render ---

    const RightElement = selectionMode ? (
        <div onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={{ color: 'var(--text-primary)', fontSize: '15px', padding: '0 8px' }}>取消</div>
    ) : (
        <div onClick={() => { setShowMenu(true); setNameInput(''); }} style={{ padding: '0 8px', fontSize: '20px', cursor: 'pointer' }}>+</div>
    );

    return (
        <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Navbar 
                title={selectionMode ? `已选 ${selectedIds.size} 项` : title} 
                onBack={handleBack} 
                rightElement={RightElement}
                showBack={true}
            />

            {/* Toolbar Area */}
            {!selectionMode && (
                <div style={{ background: 'var(--bg-body)', zIndex: 10 }}>
                    <div style={{ padding: '0 0' }}>
                        <SearchInput 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            placeholder="搜索文件名" 
                            style={{ padding: '8px 12px', borderBottom: 'none', background: 'transparent' }}
                        />
                    </div>
                    
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '4px', 
                        padding: '0 16px 8px 16px', overflowX: 'auto', 
                        fontSize: '13px', color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap', scrollbarWidth: 'none'
                    }}>
                        <div 
                            onClick={() => handleBreadcrumbClick(null)}
                            style={{ color: breadcrumbs.length === 0 ? 'var(--text-primary)' : 'var(--primary-color)', cursor: 'pointer', fontWeight: breadcrumbs.length === 0 ? 600 : 400 }}
                        >
                            云盘
                        </div>
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.id}>
                                <span style={{opacity:0.5}}>/</span>
                                <div 
                                    onClick={() => handleBreadcrumbClick(crumb)}
                                    style={{ 
                                        color: idx === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--primary-color)', 
                                        cursor: 'pointer',
                                        fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400
                                    }}
                                >
                                    {crumb.name}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    <Tabs 
                        items={FILTERS} 
                        activeId={activeFilter} 
                        onChange={setActiveFilter} 
                        variant="pill" 
                        style={{ paddingLeft: '16px', background: 'transparent', borderBottom: 'none' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '0.5px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            共 {sortedFiles.length} 项
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div onClick={() => setShowSortSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                                排序
                            </div>
                            <div onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                {viewMode === 'list' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                )}
                                视图
                            </div>
                            <div onClick={() => setSelectionMode(true)} style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>多选</div>
                        </div>
                    </div>
                </div>
            )}

            {/* File List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: selectionMode ? '60px' : '20px' }}>
                <StateView
                    status={viewStatus}
                    onRetry={refresh}
                    emptyText="此文件夹为空"
                    emptyIcon="📂"
                    renderEmpty={() => (
                         <Empty 
                            icon="📂" 
                            text="此文件夹为空" 
                            action={
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent', fontSize: '14px' }}
                                >
                                    上传文件
                                </button>
                            }
                        />
                    )}
                >
                    {sortedFiles.length > 0 && (
                        viewMode === 'list' ? (
                            <div style={{ background: 'var(--bg-card)' }}>
                                {sortedFiles.map(file => (
                                    <FileListItem 
                                        key={file.id} 
                                        file={file} 
                                        onClick={() => handleItemClick(file)} 
                                        onLongPress={() => handleLongPress(file)}
                                        selected={selectedIds.has(file.id)}
                                        selectionMode={selectionMode}
                                        onMore={(e) => handleMoreClick(e, file)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                {sortedFiles.map(file => (
                                    <FileGridItem 
                                        key={file.id} 
                                        file={file} 
                                        onClick={() => handleItemClick(file)} 
                                        onLongPress={() => handleLongPress(file)}
                                        selected={selectedIds.has(file.id)}
                                        selectionMode={selectionMode}
                                        onMore={(e) => handleMoreClick(e, file)}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </StateView>
            </div>

            {/* Bottom Actions for Selection */}
            {selectionMode && (
                <div style={{ 
                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                    height: '56px', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
                    zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)'
                }}>
                    <div onClick={handleSelectAll} style={{ fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        {selectedIds.size === files.length ? '取消全选' : '全选'}
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        <div onClick={() => Toast.info('下载功能 (Demo)')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: selectedIds.size > 0 ? 1 : 0.4 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <div onClick={() => Toast.info('移动功能 (Demo)')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: selectedIds.size > 0 ? 1 : 0.4 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div onClick={() => setShowDeleteDialog(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fa5151', opacity: selectedIds.size > 0 ? 1 : 0.4 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Sheet */}
            <ActionSheet visible={showMenu} onClose={() => setShowMenu(false)}>
                <div style={{ background: 'var(--bg-card)' }}>
                    <div onClick={() => { setShowMenu(false); setShowFolderDialog(true); }} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', cursor: 'pointer' }}>新建文件夹</div>
                    <div onClick={() => fileInputRef.current?.click()} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', cursor: 'pointer' }}>上传文件</div>
                    <div onClick={() => setShowMenu(false)} style={{ padding: '16px', textAlign: 'center', borderTop: '8px solid var(--bg-body)', fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer' }}>取消</div>
                </div>
            </ActionSheet>
            
            {/* File Action Sheet */}
            <ActionSheet visible={!!activeFile} onClose={() => setActiveFile(null)}>
                <div style={{ background: 'var(--bg-card)' }}>
                    {activeFile && (
                        <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)' }}>
                             <FileIcon type={activeFile.type} url={activeFile.url} />
                             <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{activeFile.name}</div>
                                 <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatBytes(activeFile.size || 0)} · {new Date(activeFile.updateTime).toLocaleDateString()}</div>
                             </div>
                        </div>
                    )}
                    <div onClick={() => { setShowRenameDialog(true); setActiveFile(null); }} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', cursor: 'pointer' }}>重命名</div>
                    <div onClick={() => { Toast.info('下载功能 (Demo)'); setActiveFile(null); }} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', cursor: 'pointer' }}>下载</div>
                    <div onClick={() => { Toast.info('移动功能 (Demo)'); setActiveFile(null); }} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', cursor: 'pointer' }}>移动</div>
                    <div onClick={() => { setShowDeleteDialog(true); }} style={{ padding: '16px', textAlign: 'center', borderBottom: '0.5px solid var(--border-color)', fontSize: '16px', color: '#fa5151', cursor: 'pointer' }}>删除</div>
                    <div onClick={() => setActiveFile(null)} style={{ padding: '16px', textAlign: 'center', borderTop: '8px solid var(--bg-body)', fontSize: '16px', color: 'var(--text-secondary)', cursor: 'pointer' }}>取消</div>
                </div>
            </ActionSheet>

            {/* Sort Sheet */}
            <ActionSheet visible={showSortSheet} onClose={() => setShowSortSheet(false)} title="排序方式">
                <div style={{ background: 'var(--bg-card)', paddingBottom: '20px' }}>
                    {[
                        { key: 'time', label: '按时间' },
                        { key: 'name', label: '按名称' },
                        { key: 'size', label: '按大小' }
                    ].map(opt => (
                        <div 
                            key={opt.key}
                            onClick={() => { setSortField(opt.key as any); setShowSortSheet(false); }}
                            style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '0.5px solid var(--border-color)' }}
                        >
                            <span>{opt.label}</span>
                            {sortField === opt.key && <span style={{ color: 'var(--primary-color)' }}>✓</span>}
                        </div>
                    ))}
                </div>
            </ActionSheet>

            {/* Create Folder Dialog */}
            <Dialog 
                visible={showFolderDialog}
                title="新建文件夹"
                content={
                    <Input 
                        placeholder="请输入文件夹名称" 
                        value={nameInput} 
                        onChange={e => setNameInput(e.target.value)}
                        autoFocus
                        containerStyle={{ margin: '16px 0 0 0', background: 'var(--bg-body)' }}
                    />
                }
                actions={[
                    { text: '取消', onClick: () => setShowFolderDialog(false) },
                    { text: '创建', onClick: handleCreateFolder, primary: true }
                ]}
            />

            {/* Rename Dialog */}
            <Dialog 
                visible={showRenameDialog}
                title="重命名"
                content={
                    <Input 
                        placeholder="请输入新名称" 
                        value={nameInput} 
                        onChange={e => setNameInput(e.target.value)}
                        autoFocus
                        containerStyle={{ margin: '16px 0 0 0', background: 'var(--bg-body)' }}
                    />
                }
                actions={[
                    { text: '取消', onClick: () => setShowRenameDialog(false) },
                    { text: '确定', onClick: handleRename, primary: true }
                ]}
            />

            {/* Delete Dialog */}
            <Dialog 
                visible={showDeleteDialog}
                title="确认删除"
                content={`确定删除选中的 ${selectionMode ? selectedIds.size : (activeFile ? 1 : 0)} 项文件吗？此操作无法撤销。`}
                actions={[
                    { text: '取消', onClick: () => setShowDeleteDialog(false) },
                    { text: '删除', onClick: handleDelete, danger: true }
                ]}
            />
            
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
        </div>
    );
};