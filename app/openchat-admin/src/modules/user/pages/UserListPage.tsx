/**
 * UserListPage 组件
 * 
 * 职责：
 * 1. 展示用户列表，支持分页、搜索和排序
 * 2. 显示用户的基本信息，如用户名、邮箱、角色、状态等
 * 3. 提供用户的操作功能，如编辑、删除、禁用等
 * 4. 支持批量操作，如批量删除、批量禁用等
 */

import React, { useState, useEffect } from 'react';

// 用户类型定义
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  lastLogin: string;
}

// 模拟用户数据
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01 10:00:00',
    lastLogin: '2026-02-03 09:00:00'
  },
  {
    id: '2',
    username: 'user1',
    email: 'user1@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-02 11:00:00',
    lastLogin: '2026-02-02 10:00:00'
  },
  {
    id: '3',
    username: 'user2',
    email: 'user2@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2026-01-03 12:00:00',
    lastLogin: '2026-01-30 11:00:00'
  },
  {
    id: '4',
    username: 'user3',
    email: 'user3@example.com',
    role: 'guest',
    status: 'banned',
    createdAt: '2026-01-04 13:00:00',
    lastLogin: '2026-01-29 12:00:00'
  },
  {
    id: '5',
    username: 'user4',
    email: 'user4@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-05 14:00:00',
    lastLogin: '2026-02-01 13:00:00'
  },
  {
    id: '6',
    username: 'user5',
    email: 'user5@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-06 15:00:00',
    lastLogin: '2026-01-31 14:00:00'
  },
  {
    id: '7',
    username: 'user6',
    email: 'user6@example.com',
    role: 'guest',
    status: 'active',
    createdAt: '2026-01-07 16:00:00',
    lastLogin: '2026-01-30 15:00:00'
  },
  {
    id: '8',
    username: 'user7',
    email: 'user7@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2026-01-08 17:00:00',
    lastLogin: '2026-01-28 16:00:00'
  },
  {
    id: '9',
    username: 'user8',
    email: 'user8@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-09 18:00:00',
    lastLogin: '2026-02-03 17:00:00'
  },
  {
    id: '10',
    username: 'user9',
    email: 'user9@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-10 19:00:00',
    lastLogin: '2026-02-02 18:00:00'
  }
];

// 获取角色对应的显示文本
const getRoleText = (role: string) => {
  switch (role) {
    case 'admin':
      return '管理员';
    case 'user':
      return '普通用户';
    case 'guest':
      return '访客';
    default:
      return role;
  }
};

// 获取状态对应的显示文本和样式
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'active':
      return { text: '活跃', className: 'badge-success' };
    case 'inactive':
      return { text: '非活跃', className: 'badge-warning' };
    case 'banned':
      return { text: '禁用', className: 'badge-danger' };
    default:
      return { text: status, className: 'badge-primary' };
  }
};

// 用户列表页面组件
export const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof User>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 过滤和排序用户
  useEffect(() => {
    let result = [...users];

    // 搜索过滤
    if (searchTerm) {
      result = result.filter(
        user =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 排序
    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, searchTerm, sortField, sortDirection]);

  // 计算分页信息
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理排序
  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  // 处理用户选择
  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user.id));
    }
  };

  // 处理删除用户
  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)));
    setSelectedUsers([]);
    setShowDeleteModal(false);
  };

  // 处理编辑用户
  const handleEditUser = (userId: string) => {
    // 这里应该跳转到编辑页面或打开编辑模态框
    console.log('Edit user:', userId);
  };

  // 处理禁用/启用用户
  const handleToggleStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            status: user.status === 'active' ? 'inactive' : 'active'
          };
        }
        return user;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">用户列表</h1>
          <p className="text-gray-500 mt-1">管理系统用户</p>
        </div>
        <div className="flex space-x-2">
          <a href="/users/create" className="btn btn-primary">
            创建用户
          </a>
          {selectedUsers.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              批量删除
            </button>
          )}
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={handleSearch}
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">每页显示:</span>
              <select
                className="border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              共 {totalItems} 个用户
            </div>
          </div>
        </div>
      </div>

      {/* 用户列表表格 */}
      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                />
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('username')}
              >
                用户名
                {sortField === 'username' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('email')}
              >
                邮箱
                {sortField === 'email' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('role')}
              >
                角色
                {sortField === 'role' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('status')}
              >
                状态
                {sortField === 'status' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('createdAt')}
              >
                创建时间
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('lastLogin')}
              >
                最后登录
                {sortField === 'lastLogin' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => {
              const statusInfo = getStatusInfo(user.status);
              return (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleUserSelect(user.id)}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500"
                    />
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{getRoleText(user.role)}</td>
                  <td>
                    <span className={`badge ${statusInfo.className}`}>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>{user.lastLogin}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-secondary py-1 px-2 text-xs"
                        onClick={() => handleEditUser(user.id)}
                      >
                        编辑
                      </button>
                      <button
                        className={`btn ${user.status === 'active' ? 'btn-warning' : 'btn-success'} py-1 px-2 text-xs`}
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? '禁用' : '启用'}
                      </button>
                      <button
                        className="btn btn-danger py-1 px-2 text-xs"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 空状态 */}
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">没有找到符合条件的用户</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            显示 {startIndex + 1} 到 {Math.min(endIndex, totalItems)} 共 {totalItems} 个用户
          </div>
          <div className="flex space-x-1">
            <button
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              首页
            </button>
            <button
              className={`px-3 py-1 rounded border ${currentPage === 1 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter(page => page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2))
              .map(page => (
                <button
                  key={page}
                  className={`px-3 py-1 rounded border ${currentPage === page ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            <button
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
            <button
              className={`px-3 py-1 rounded border ${currentPage === totalPages ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              末页
            </button>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              您确定要删除选中的 {selectedUsers.length} 个用户吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-danger"
                onClick={handleBatchDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;