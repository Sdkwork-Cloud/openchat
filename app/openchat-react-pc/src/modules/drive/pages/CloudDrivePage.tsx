import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder, File, Upload, Plus, Search, Grid, List, MoreVertical,
  Star, Download, Trash2, Edit3, Move, Share2, ChevronRight,
  HardDrive, Image, Video, Music, FileText, FileCode, FileArchive,
  FileSpreadsheet, Presentation
} from 'lucide-react';
import { FileService } from '../services/FileService';
import { FileNode, FileType as DriveFileType, StorageStats, BreadcrumbItem } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent } from '../../../components/ui/Card';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Progress } from '../../../components/ui/Progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/DropdownMenu';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const FileIcon: React.FC<{ type: DriveFileType; size?: 'sm' | 'md' | 'lg' }> = ({ type, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl'
  };

  const iconConfig = FileService.getFileIcon(type);

  return (
    <div
      className={cn("rounded-lg flex items-center justify-center", sizeClasses[size])}
      style={{ backgroundColor: iconConfig.bg }}
    >
      <span>{iconConfig.icon}</span>
    </div>
  );
};

const FileGridItem: React.FC<{
  file: FileNode;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onStar: () => void;
  onRename: () => void;
  onDelete: () => void;
}> = ({ file, isSelected, onSelect, onDoubleClick, onStar, onRename, onDelete }) => {
  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border cursor-pointer transition-all",
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex flex-col items-center gap-3">
        <FileIcon type={file.type} size="lg" />
        <div className="text-center w-full">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.type === 'folder' ? '文件夹' : FileService.formatBytes(file.size || 0)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStar(); }}>
              <Star className={cn("w-4 h-4 mr-2", file.isStarred && "fill-yellow-400 text-yellow-400")} />
              {file.isStarred ? '取消收藏' : '收藏'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <Edit3 className="w-4 h-4 mr-2" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              <Download className="w-4 h-4 mr-2" />
              下载
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {file.isStarred && (
        <div className="absolute top-2 left-2">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        </div>
      )}
    </div>
  );
};

const FileListItem: React.FC<{
  file: FileNode;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onStar: () => void;
  onRename: () => void;
  onDelete: () => void;
}> = ({ file, isSelected, onSelect, onDoubleClick, onStar, onRename, onDelete }) => {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all",
        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <FileIcon type={file.type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
      </div>
      <div className="text-sm text-muted-foreground w-24 text-right">
        {file.type === 'folder' ? '--' : FileService.formatBytes(file.size || 0)}
      </div>
      <div className="text-sm text-muted-foreground w-32 text-right">
        {file.updateTime ? new Date(file.updateTime).toLocaleDateString() : '-'}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onStar(); }}>
          <Star className={cn("w-4 h-4", file.isStarred && "fill-yellow-400 text-yellow-400")} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <Edit3 className="w-4 h-4 mr-2" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
              <Download className="w-4 h-4 mr-2" />
              下载
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const CloudDrivePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFile, setRenameFile] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadBreadcrumbs();
    loadStats();
  }, [currentFolderId]);

  const loadBreadcrumbs = async () => {
    const items = await FileService.getBreadcrumbs(currentFolderId);
    setBreadcrumbs(items);
  };

  const loadStats = async () => {
    const { data } = await FileService.getStorageStats();
    if (data) setStats(data);
  };

  const { data: filesData, viewStatus, refresh } = useLiveQuery(
    () => FileService.getFilesByParent(currentFolderId, { search: searchQuery }),
    [currentFolderId, searchQuery]
  );
  const files: FileNode[] = (filesData as any) || [];

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'folder') {
      setCurrentFolderId(file.id);
      setSelectedFiles(new Set());
    }
  };

  const handleBreadcrumbClick = (id: string | null) => {
    setCurrentFolderId(id);
    setSelectedFiles(new Set());
  };

  const handleSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await FileService.createFolder(currentFolderId, newFolderName);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
    refresh();
    toast.success('文件夹创建成功');
  };

  const handleRename = async () => {
    if (!renameFile || !renameValue.trim()) return;
    await FileService.renameFile(renameFile.id, renameValue);
    setRenameFile(null);
    setRenameValue('');
    refresh();
    toast.success('重命名成功');
  };

  const handleDelete = async (file: FileNode) => {
    if (window.confirm(`确定要删除 "${file.name}" 吗？`)) {
      await FileService.deleteFiles([file.id]);
      refresh();
      loadStats();
      toast.success('删除成功');
    }
  };

  const handleStar = async (file: FileNode) => {
    await FileService.toggleStar(file.id);
    refresh();
    toast.success(file.isStarred ? '已取消收藏' : '已收藏');
  };

  const usagePercent = stats ? (stats.used / stats.total) * 100 : 0;

  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card hidden lg:block">
        <div className="p-4">
          <Button className="w-full justify-start gap-2" onClick={() => setIsCreateFolderOpen(true)}>
            <Plus className="w-4 h-4" />
            新建文件夹
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <button
              onClick={() => handleBreadcrumbClick(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                currentFolderId === null ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <HardDrive className="w-4 h-4" />
              全部文件
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <Image className="w-4 h-4" />
              图片
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <Video className="w-4 h-4" />
              视频
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <Music className="w-4 h-4" />
              音乐
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <Star className="w-4 h-4" />
              收藏
            </button>
          </div>
        </ScrollArea>

        {/* Storage Info */}
        {stats && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">存储空间</span>
              <span className="text-xs text-muted-foreground">
                {FileService.formatBytes(stats.used)} / {FileService.formatBytes(stats.total)}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              剩余 {FileService.formatBytes(stats.available)}
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBreadcrumbClick(null)}
              className={cn(
                "text-sm hover:text-primary transition-colors",
                currentFolderId === null ? "font-medium text-primary" : "text-muted-foreground"
              )}
            >
              全部文件
            </button>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={item.id}>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <button
                  onClick={() => handleBreadcrumbClick(item.id)}
                  className={cn(
                    "text-sm hover:text-primary transition-colors",
                    index === breadcrumbs.length - 1 ? "font-medium text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="搜索文件..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid' ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list' ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              上传
            </Button>
          </div>
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 p-6">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Folder className="w-16 h-16 mb-4 opacity-20" />
              <p>文件夹为空</p>
              <p className="text-sm">点击"新建文件夹"或"上传"按钮添加文件</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {files.map(file => (
                <FileGridItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={() => handleSelect(file.id)}
                  onDoubleClick={() => handleFileClick(file)}
                  onStar={() => handleStar(file)}
                  onRename={() => { setRenameFile(file); setRenameValue(file.name); }}
                  onDelete={() => handleDelete(file)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {files.map(file => (
                <FileListItem
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={() => handleSelect(file.id)}
                  onDoubleClick={() => handleFileClick(file)}
                  onStar={() => handleStar(file)}
                  onRename={() => { setRenameFile(file); setRenameValue(file.name); }}
                  onDelete={() => handleDelete(file)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newFolderName}
              onChange={(value) => setNewFolderName(value)}
              placeholder="文件夹名称"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>取消</Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>创建</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameFile} onOpenChange={() => setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameValue}
              onChange={(value) => setRenameValue(value)}
              placeholder="新名称"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameFile(null)}>取消</Button>
              <Button onClick={handleRename} disabled={!renameValue.trim()}>重命名</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
