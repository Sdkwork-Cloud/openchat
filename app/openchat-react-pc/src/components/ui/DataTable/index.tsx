/**
 * DataTable 组件 - 企业级表格组件（深色主题版）
 *
 * 设计原则：
 * 1. 单一职责：只负责表格展示和交互
 * 2. 开闭原则：通过配置扩展功能，不修改源码
 * 3. 依赖倒置：依赖抽象类型，不依赖具体实现
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   dataSource={data}
 *   pagination={{ page: 1, size: 10, total: 100 }}
 *   onPaginationChange={handlePageChange}
 * />
 * ```
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  TableColumn,
  TablePagination,
  TableRowSelection,
  BaseComponentProps,
  SortChangeEvent,
} from '../../../types/common';

// ==================== 类型定义 ====================

/**
 * DataTable Props 定义
 */
export interface DataTableProps<T = unknown> extends BaseComponentProps {
  /** 列定义 */
  columns: TableColumn<T>[];
  /** 数据源 */
  dataSource: T[];
  /** 加载状态 */
  loading?: boolean;
  /** 空状态提示 */
  emptyText?: string;
  /** 行唯一标识字段 */
  rowKey?: keyof T | ((record: T) => string);
  /** 行选择配置 */
  rowSelection?: TableRowSelection<T>;
  /** 分页配置 */
  pagination?: TablePagination | false;
  /** 排序变化回调 */
  onSortChange?: (event: SortChangeEvent) => void;
  /** 行点击回调 */
  onRowClick?: (record: T, index: number) => void;
  /** 行类名 */
  rowClassName?: string | ((record: T, index: number) => string);
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否显示斑马纹 */
  striped?: boolean;
  /** 是否紧凑模式 */
  size?: 'default' | 'small' | 'large';
}

// ==================== 子组件 ====================

/**
 * 分页组件
 */
interface PaginationProps {
  pagination: TablePagination;
  onChange: (page: number, size: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ pagination, onChange }) => {
  const {
    page = 1,
    size = 10,
    total = 0,
    pageSizeOptions = [10, 20, 50, 100],
    showQuickJumper = false,
    showTotal = true,
  } = pagination;

  const totalPages = Math.ceil(total / size) || 1;
  const startItem = (page - 1) * size + 1;
  const endItem = Math.min(page * size, total);

  // 计算显示的页码
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [page, totalPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onChange(newPage, size);
    }
  };

  const handleSizeChange = (newSize: number) => {
    const newPage = Math.min(page, Math.ceil(total / newSize));
    onChange(newPage, newSize);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
      {/* 总数信息 */}
      {showTotal && (
        <div className="text-sm text-[var(--text-secondary)]">
          共 <span className="font-medium text-[var(--text-primary)]">{total}</span> 条
          {total > 0 && (
            <span className="ml-1">
              (第 {startItem}-{endItem} 条)
            </span>
          )}
        </div>
      )}

      {/* 分页控制 */}
      <div className="flex items-center space-x-2">
        {/* 每页条数选择 */}
        <select
          value={size}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
          className="h-8 px-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--ai-primary)]"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option} className="bg-[var(--bg-secondary)]">
              {option}条/页
            </option>
          ))}
        </select>

        {/* 上一页 */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>

        {/* 页码 */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((p, index) => (
            <React.Fragment key={index}>
              {p === '...' ? (
                <span className="px-2 text-[var(--text-muted)]">...</span>
              ) : (
                <button
                  onClick={() => handlePageChange(p as number)}
                  className={`min-w-[32px] h-8 px-2 text-sm rounded transition-colors ${
                    page === p
                      ? 'bg-[var(--ai-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)]'
                  }`}
                >
                  {p}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 下一页 */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>

        {/* 快速跳转 */}
        {showQuickJumper && (
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-[var(--text-secondary)]">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  if (value >= 1 && value <= totalPages) {
                    handlePageChange(value);
                  }
                }
              }}
              className="w-12 h-8 px-2 text-sm text-center bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--ai-primary)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">页</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

/**
 * DataTable 企业级表格组件
 *
 * 功能特性：
 * - 数据展示
 * - 分页控制
 * - 行选择
 * - 排序
 * - 自定义渲染
 * - 加载状态
 * - 空状态
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  dataSource,
  loading = false,
  emptyText = '暂无数据',
  rowKey = 'id' as keyof T,
  rowSelection,
  pagination,
  onSortChange,
  onRowClick,
  rowClassName,
  bordered = false,
  striped = true,
  size = 'default',
  className,
  style,
}: DataTableProps<T>) {
  // 获取行唯一标识
  const getRowKey = useCallback(
    (record: T): string => {
      if (typeof rowKey === 'function') {
        return rowKey(record);
      }
      return String(record[rowKey]);
    },
    [rowKey]
  );

  // 排序状态
  const [sortState, setSortState] = useState<{ field: string; order: 'asc' | 'desc' | null }>({
    field: '',
    order: null,
  });

  // 处理排序
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    let newOrder: 'asc' | 'desc' | null = 'asc';
    if (sortState.field === column.key && sortState.order === 'asc') {
      newOrder = 'desc';
    } else if (sortState.field === column.key && sortState.order === 'desc') {
      newOrder = null;
    }

    setSortState({ field: column.key, order: newOrder });
    onSortChange?.({ field: column.key, order: newOrder });
  };

  // 获取单元格值
  const getCellValue = (record: T, dataIndex: keyof T | string | undefined): unknown => {
    if (!dataIndex) return '';
    return record[dataIndex as keyof T];
  };

  // 获取行类名
  const getRowClassName = (record: T, index: number): string => {
    const classes: string[] = [];

    if (striped && index % 2 === 1) {
      classes.push('bg-[var(--bg-tertiary)]/30');
    }

    if (onRowClick) {
      classes.push('cursor-pointer hover:bg-[var(--bg-tertiary)]');
    }

    if (rowClassName) {
      if (typeof rowClassName === 'function') {
        classes.push(rowClassName(record, index));
      } else {
        classes.push(rowClassName);
      }
    }

    return classes.join(' ');
  };

  // 尺寸样式
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      default:
        return 'text-sm';
    }
  }, [size]);

  const cellPaddingClasses = useMemo(() => {
    switch (size) {
      case 'small':
        return 'px-3 py-2';
      case 'large':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  }, [size]);

  return (
    <div className={`flex flex-col ${className || ''}`} style={style}>
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table
          className={`w-full ${sizeClasses} ${bordered ? 'border border-[var(--border-color)]' : ''}`}
        >
          {/* 表头 */}
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              {/* 选择列 */}
              {rowSelection && (
                <th
                  className={`${cellPaddingClasses} text-left font-medium text-[var(--text-secondary)] border-b border-[var(--border-color)] w-12`}
                >
                  {rowSelection.showSelectAll !== false && (
                    <input
                      type="checkbox"
                      checked={
                        rowSelection.selectedRowKeys?.length === dataSource.length &&
                        dataSource.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          rowSelection.onChange?.(
                            dataSource.map(getRowKey),
                            [...dataSource]
                          );
                        } else {
                          rowSelection.onChange?.([], []);
                        }
                      }}
                      className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
                    />
                  )}
                </th>
              )}

              {/* 数据列 */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${cellPaddingClasses}
                    text-left font-medium text-[var(--text-secondary)]
                    border-b border-[var(--border-color)]
                    ${column.sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <span className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${
                            sortState.field === column.key && sortState.order === 'asc'
                              ? 'text-[var(--ai-primary)]'
                              : 'text-[var(--text-muted)]'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${
                            sortState.field === column.key && sortState.order === 'desc'
                              ? 'text-[var(--ai-primary)]'
                              : 'text-[var(--text-muted)]'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {loading ? (
              // 加载状态
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-[var(--border-color)] border-t-[var(--ai-primary)] rounded-full animate-spin" />
                    <span className="text-[var(--text-muted)]">加载中...</span>
                  </div>
                </td>
              </tr>
            ) : dataSource.length === 0 ? (
              // 空状态
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="text-[var(--text-muted)]">{emptyText}</div>
                </td>
              </tr>
            ) : (
              // 数据行
              dataSource.map((record, index) => {
                const key = getRowKey(record);
                const isSelected = rowSelection?.selectedRowKeys?.includes(key);

                return (
                  <tr
                    key={key}
                    className={`
                      ${getRowClassName(record, index)}
                      ${isSelected ? 'bg-[var(--ai-primary)]/10' : ''}
                      transition-colors
                    `}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {/* 选择单元格 */}
                    {rowSelection && (
                      <td
                        className={`${cellPaddingClasses} border-b border-[var(--border-color)]`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const selectedKeys = rowSelection.selectedRowKeys || [];
                            const selectedRows: T[] = [];

                            if (e.target.checked) {
                              const newKeys = [...selectedKeys, key];
                              rowSelection.onChange?.(newKeys, selectedRows);
                            } else {
                              const newKeys = selectedKeys.filter((k) => k !== key);
                              rowSelection.onChange?.(newKeys, selectedRows);
                            }
                          }}
                          className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
                        />
                      </td>
                    )}

                    {/* 数据单元格 */}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          ${cellPaddingClasses}
                          border-b border-[var(--border-color)]
                          text-[var(--text-primary)]
                          ${column.align === 'center' ? 'text-center' : ''}
                          ${column.align === 'right' ? 'text-right' : ''}
                        `}
                      >
                        {column.render
                          ? column.render(getCellValue(record, column.dataIndex), record, index)
                          : String(getCellValue(record, column.dataIndex) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && (
        <Pagination
          pagination={pagination}
          onChange={(page, size) => {
            pagination.onChange?.(page, size);
          }}
        />
      )}
    </div>
  );
}

export default DataTable;
