/**
 * UserCreatePage 组件
 * 
 * 职责：
 * 1. 提供用户创建表单，收集用户信息
 * 2. 验证用户输入数据的合法性
 * 3. 提交用户创建请求到后端
 * 4. 显示操作结果和错误信息
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 用户创建页面组件
export const UserCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    status: 'active' as 'active' | 'inactive' | 'banned'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 处理表单输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    // 验证用户名
    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名长度至少为3个字符';
    } else if (formData.username.length > 20) {
      newErrors.username = '用户名长度不能超过20个字符';
    }

    // 验证邮箱
    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = '邮箱格式不正确';
      }
    }

    // 验证密码
    if (!formData.password) {
      newErrors.password = '密码不能为空';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少为6个字符';
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = '两次输入的密码不一致';
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
      setSuccessMessage('用户创建成功！');

      // 重置表单
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        status: 'active'
      });

      // 3秒后跳转到用户列表页面
      setTimeout(() => {
        navigate('/users/list');
      }, 3000);
    } catch (error) {
      setErrors({ submit: '创建用户失败，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">创建用户</h1>
        <p className="text-gray-500 mt-1">添加新用户到系统</p>
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

            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名 <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`input ${errors.username ? 'border-danger-500' : ''}`}
                placeholder="请输入用户名"
              />
              {errors.username && (
                <p className="text-danger-500 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱 <span className="text-danger-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'border-danger-500' : ''}`}
                placeholder="请输入邮箱"
              />
              {errors.email && (
                <p className="text-danger-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 <span className="text-danger-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input ${errors.password ? 'border-danger-500' : ''}`}
                placeholder="请输入密码"
              />
              {errors.password && (
                <p className="text-danger-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 <span className="text-danger-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input ${errors.confirmPassword ? 'border-danger-500' : ''}`}
                placeholder="请确认密码"
              />
              {errors.confirmPassword && (
                <p className="text-danger-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* 权限设置 */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-800">权限设置</h2>

            {/* 角色 */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                角色 <span className="text-danger-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="admin">管理员</option>
                <option value="user">普通用户</option>
                <option value="guest">访客</option>
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                状态 <span className="text-danger-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="banned">禁用</option>
              </select>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/users/list')}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '创建用户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreatePage;