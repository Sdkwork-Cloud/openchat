import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Plus, Edit2, Trash2, Check, AlertCircle,
  MessageSquare, Image, Video, Mic, Music, ChevronRight,
  Settings2, Copy, Power
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ModelConfig } from '../types';
import { SettingsService } from '../services/SettingsService';

// 模型领域图标
const domainIcons = {
  text: MessageSquare,
  image: Image,
  video: Video,
  speech: Mic,
  music: Music,
};

const domainLabels = {
  text: '文本对话',
  image: '图像生成',
  video: '视频生成',
  speech: '语音识别',
  music: '音乐生成',
};

const domainColors = {
  text: 'bg-blue-100 text-blue-600',
  image: 'bg-purple-100 text-purple-600',
  video: 'bg-red-100 text-red-600',
  speech: 'bg-green-100 text-green-600',
  music: 'bg-orange-100 text-orange-600',
};

// 模型卡片组件
const ModelCard: React.FC<{
  config: ModelConfig;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onToggle: () => void;
}> = ({ config, onEdit, onDelete, onSetDefault, onToggle }) => {
  const DomainIcon = domainIcons[config.domain];

  return (
    <div className={cn(
      "bg-white rounded-xl border-2 p-5 transition-all",
      config.isDefault 
        ? "border-blue-500 shadow-md" 
        : "border-gray-100 hover:border-gray-200"
    )}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", domainColors[config.domain])}>
            <DomainIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.name}</h3>
            <p className="text-sm text-gray-500">{config.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.isDefault && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
              默认
            </span>
          )}
          <button
            onClick={onToggle}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              config.isEnabled ? "bg-blue-500" : "bg-gray-300"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                config.isEnabled ? "left-7" : "left-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* 模型信息 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">模型 ID</span>
          <span className="text-gray-900 font-mono">{config.modelId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Temperature</span>
          <span className="text-gray-900">{config.temperature}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Max Tokens</span>
          <span className="text-gray-900">{config.maxTokens.toLocaleString()}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          编辑
        </button>
        {!config.isDefault && (
          <button
            onClick={onSetDefault}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            设为默认
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          删除
        </button>
      </div>
    </div>
  );
};

// 空状态组件
const EmptyState: React.FC<{ onAdd: () => void; domain: string }> = ({ onAdd, domain }) => (
  <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Sparkles className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      暂无{domain}模型配置
    </h3>
    <p className="text-gray-500 mb-4">
      添加一个模型配置以开始使用 AI {domain}功能
    </p>
    <Button onClick={onAdd}>
      <Plus className="w-4 h-4 mr-2" />
      添加配置
    </Button>
  </div>
);

// 主页面
export const ModelSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await SettingsService.getModelConfigs();
      setConfigs(data);
    } catch (error) {
      showToast('加载配置失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      await SettingsService.deleteModelConfig(configId);
      await loadConfigs();
      setShowDeleteConfirm(null);
      showToast('配置已删除', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleSetDefault = async (configId: string) => {
    try {
      await SettingsService.setDefaultModelConfig(configId);
      await loadConfigs();
      showToast('默认模型已更新', 'success');
    } catch (error) {
      showToast('设置失败', 'error');
    }
  };

  const handleToggle = async (config: ModelConfig) => {
    try {
      await SettingsService.saveModelConfig({
        ...config,
        isEnabled: !config.isEnabled,
      });
      await loadConfigs();
      showToast(config.isEnabled ? '模型已禁用' : '模型已启用', 'success');
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.domain]) {
      acc[config.domain] = [];
    }
    acc[config.domain].push(config);
    return acc;
  }, {} as Record<string, ModelConfig[]>);

  const domains = ['text', 'image', 'video', 'speech', 'music'] as const;

  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-blue-500" />
            AI 模型配置
          </h1>
          <p className="text-gray-500 mt-2">
            管理您的 AI 模型配置，包括文本对话、图像生成、视频生成等
          </p>
        </div>
        <Button onClick={() => navigate('/settings/models/new')}>
          <Plus className="w-4 h-4 mr-2" />
          添加配置
        </Button>
      </div>

      {/* 快速导航 */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDomain(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
            selectedDomain === null
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          全部
        </button>
        {domains.map((domain) => {
          const DomainIcon = domainIcons[domain];
          const count = groupedConfigs[domain]?.length || 0;
          return (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                selectedDomain === domain
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <DomainIcon className="w-4 h-4" />
              {domainLabels[domain]}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedDomain === domain ? "bg-white/20" : "bg-gray-200"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 配置列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {domains
            .filter((domain) => !selectedDomain || domain === selectedDomain)
            .map((domain) => {
              const domainConfigs = groupedConfigs[domain] || [];
              const DomainIcon = domainIcons[domain];

              return (
                <div key={domain}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", domainColors[domain])}>
                        <DomainIcon className="w-4 h-4" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {domainLabels[domain]}
                      </h2>
                      <span className="text-sm text-gray-500">
                        ({domainConfigs.length})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/settings/models/new?domain=${domain}`)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>

                  {domainConfigs.length === 0 ? (
                    <EmptyState
                      onAdd={() => navigate(`/settings/models/new?domain=${domain}`)}
                      domain={domainLabels[domain]}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {domainConfigs.map((config) => (
                        <ModelCard
                          key={config.id}
                          config={config}
                          onEdit={() => navigate(`/settings/models/edit/${config.id}`)}
                          onDelete={() => setShowDeleteConfirm(config.id)}
                          onSetDefault={() => handleSetDefault(config.id)}
                          onToggle={() => handleToggle(config)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-amber-50 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-900">安全提示</h4>
          <p className="text-sm text-amber-700 mt-1">
            API Key 等敏感信息将被加密存储。请勿在公共场合展示您的配置详情。
          </p>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="确认删除模型配置？"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            此操作不可撤销。删除后，使用该模型的功能将无法正常工作。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              确认删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
