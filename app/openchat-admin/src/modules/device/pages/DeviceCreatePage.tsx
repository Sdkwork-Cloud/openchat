/**
 * DeviceCreatePage 组件
 * 
 * 职责：
 * 1. 提供设备创建表单，收集设备信息
 * 2. 验证设备输入数据的合法性
 * 3. 提交设备创建请求到后端
 * 4. 显示操作结果和错误信息
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 设备创建页面组件
export const DeviceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    type: 'xiaozhi' as 'xiaozhi' | 'sensor' | 'actuator' | 'camera',
    ipAddress: '',
    macAddress: '',
    metadata: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 验证表单数据
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 验证设备ID
    if (!formData.deviceId.trim()) {
      newErrors.deviceId = '设备ID不能为空';
    } else if (formData.deviceId.length < 6) {
      newErrors.deviceId = '设备ID长度至少为6个字符';
    }

    // 验证设备名称
    if (!formData.name.trim()) {
      newErrors.name = '设备名称不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '设备名称长度至少为2个字符';
    } else if (formData.name.length > 50) {
      newErrors.name = '设备名称长度不能超过50个字符';
    }

    // 验证IP地址
    if (!formData.ipAddress.trim()) {
      newErrors.ipAddress = 'IP地址不能为空';
    } else {
      const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ipAddress)) {
        newErrors.ipAddress = 'IP地址格式不正确';
      }
    }

    // 验证MAC地址
    if (!formData.macAddress.trim()) {
      newErrors.macAddress = 'MAC地址不能为空';
    } else {
      const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macRegex.test(formData.macAddress)) {
        newErrors.macAddress = 'MAC地址格式不正确';
      }
    }

    // 验证元数据（如果有）
    if (formData.metadata && formData.metadata.length > 500) {
      newErrors.metadata = '元数据长度不能超过500个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccessMessage('');

      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟创建成功
      setSuccessMessage('设备创建成功！');

      // 重置表单
      setFormData({
        deviceId: '',
        name: '',
        type: 'xiaozhi',
        ipAddress: '',
        macAddress: '',
        metadata: ''
      });

      // 3秒后跳转到设备列表页面
      setTimeout(() => {
        navigate('/devices/list');
      }, 3000);
    } catch (error) {
      setErrors({ submit: '创建设备失败，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">添加设备</h1>
        <p className="text-gray-500 mt-1">添加新设备到系统</p>
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* 错误消息 */}
      {errors.submit && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
          {errors.submit}
        </div>
      )}

      {/* 表单 */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800">基本信息</h2>

            {/* 设备ID */}
            <div>
              <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-1">
                设备ID <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="deviceId"
                name="deviceId"
                value={formData.deviceId}
                onChange={handleChange}
                className={`input ${errors.deviceId ? 'border-danger-500' : ''}`}
                placeholder="请输入设备ID"
              />
              {errors.deviceId && (
                <p className="text-danger-500 text-xs mt-1">{errors.deviceId}</p>
              )}
            </div>

            {/* 设备名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                设备名称 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-danger-500' : ''}`}
                placeholder="请输入设备名称"
              />
              {errors.name && (
                <p className="text-danger-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* 设备类型 */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                设备类型 <span className="text-danger-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input"
              >
                <option value="xiaozhi">开源小智</option>
                <option value="sensor">传感器</option>
                <option value="actuator">执行器</option>
                <option value="camera">摄像头</option>
              </select>
            </div>
          </div>

          {/* 网络信息 */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800">网络信息</h2>

            {/* IP地址 */}
            <div>
              <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 mb-1">
                IP地址 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="ipAddress"
                name="ipAddress"
                value={formData.ipAddress}
                onChange={handleChange}
                className={`input ${errors.ipAddress ? 'border-danger-500' : ''}`}
                placeholder="请输入IP地址"
              />
              {errors.ipAddress && (
                <p className="text-danger-500 text-xs mt-1">{errors.ipAddress}</p>
              )}
            </div>

            {/* MAC地址 */}
            <div>
              <label htmlFor="macAddress" className="block text-sm font-medium text-gray-700 mb-1">
                MAC地址 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="macAddress"
                name="macAddress"
                value={formData.macAddress}
                onChange={handleChange}
                className={`input ${errors.macAddress ? 'border-danger-500' : ''}`}
                placeholder="请输入MAC地址"
              />
              {errors.macAddress && (
                <p className="text-danger-500 text-xs mt-1">{errors.macAddress}</p>
              )}
            </div>
          </div>

          {/* 其他信息 */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800">其他信息</h2>

            {/* 元数据 */}
            <div>
              <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-1">
                元数据
              </label>
              <textarea
                id="metadata"
                name="metadata"
                value={formData.metadata}
                onChange={handleChange}
                className={`input ${errors.metadata ? 'border-danger-500' : ''}`}
                placeholder="请输入设备元数据（可选）"
                rows={4}
              ></textarea>
              {errors.metadata && (
                <p className="text-danger-500 text-xs mt-1">{errors.metadata}</p>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/devices/list')}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '创建设备'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceCreatePage;