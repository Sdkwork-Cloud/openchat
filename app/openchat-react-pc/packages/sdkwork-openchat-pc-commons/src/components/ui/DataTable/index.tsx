/**
 * DataTable 缁勪欢 - 浼佷笟绾ц〃鏍肩粍浠讹紙娣辫壊涓婚鐗堬級
 *
 * 璁捐鍘熷垯锛? * 1. 鍗曚竴鑱岃矗锛氬彧璐熻矗琛ㄦ牸灞曠ず鍜屼氦浜? * 2. 寮€闂師鍒欙細閫氳繃閰嶇疆鎵╁睍鍔熻兘锛屼笉淇敼婧愮爜
 * 3. 渚濊禆鍊掔疆锛氫緷璧栨娊璞＄被鍨嬶紝涓嶄緷璧栧叿浣撳疄鐜? *
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

import React, { useCallback, useMemo, useState } from "react";
import type {
  TableColumn,
  TablePagination,
  TableRowSelection,
  BaseComponentProps,
  SortChangeEvent,
} from "../../../types/common";

// ==================== 绫诲瀷瀹氫箟 ====================

/**
 * DataTable Props 瀹氫箟
 */
export interface DataTableProps<T = unknown> extends BaseComponentProps {
  /** 鍒楀畾涔?*/
  columns: TableColumn<T>[];
  /** 鏁版嵁婧?*/
  dataSource: T[];
  /** 鍔犺浇鐘舵€?*/
  loading?: boolean;
  /** 绌虹姸鎬佹彁绀?*/
  emptyText?: string;
  /** 琛屽敮涓€鏍囪瘑瀛楁 */
  rowKey?: keyof T | ((record: T) => string);
  /** 琛岄€夋嫨閰嶇疆 */
  rowSelection?: TableRowSelection<T>;
  /** 鍒嗛〉閰嶇疆 */
  pagination?: TablePagination | false;
  /** 鎺掑簭鍙樺寲鍥炶皟 */
  onSortChange?: (event: SortChangeEvent) => void;
  /** 琛岀偣鍑诲洖璋?*/
  onRowClick?: (record: T, index: number) => void;
  /** 琛岀被鍚?*/
  rowClassName?: string | ((record: T, index: number) => string);
  /** 鏄惁鏄剧ず杈规 */
  bordered?: boolean;
  /** 鏄惁鏄剧ず鏂戦┈绾?*/
  striped?: boolean;
  /** 鏄惁绱у噾妯″紡 */
  size?: "default" | "small" | "large";
}

// ==================== 瀛愮粍浠?====================

/**
 * 鍒嗛〉缁勪欢
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

  // 璁＄畻鏄剧ず鐨勯〉鐮?  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push("...");
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
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-t border-border">
      {/* 鎬绘暟淇℃伅 */}
      {showTotal && (
        <div className="text-sm text-text-secondary">
          鍏?<span className="font-medium text-text-primary">{total}</span> 鏉?          {total > 0 && (
            <span className="ml-1">
              (绗?{startItem}-{endItem} 鏉?
            </span>
          )}
        </div>
      )}

      {/* 鍒嗛〉鎺у埗 */}
      <div className="flex items-center space-x-2">
        {/* 姣忛〉鏉℃暟閫夋嫨 */}
        <select
          value={size}
          onChange={(e) => handleSizeChange(Number(e.target.value))}
          className="h-8 px-2 text-sm bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:border-primary"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option} className="bg-bg-secondary">
              {option}鏉?椤?            </option>
          ))}
        </select>

        {/* 涓婁竴椤?*/}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded text-text-primary hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          涓婁竴椤?        </button>

        {/* 椤电爜 */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((p, index) => (
            <React.Fragment key={index}>
              {p === "..." ? (
                <span className="px-2 text-text-muted">...</span>
              ) : (
                <button
                  onClick={() => handlePageChange(p as number)}
                  className={`min-w-[32px] h-8 px-2 text-sm rounded transition-colors ${
                    page === p
                      ? "bg-primary text-white"
                      : "bg-bg-tertiary border border-border text-text-primary hover:border-primary hover:text-primary"
                  }`}
                >
                  {p}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 涓嬩竴椤?*/}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded text-text-primary hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          涓嬩竴椤?        </button>

        {/* 蹇€熻烦杞?*/}
        {showQuickJumper && (
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-text-secondary">璺宠嚦</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = parseInt((e.target as HTMLInputElement).value);
                  if (value >= 1 && value <= totalPages) {
                    handlePageChange(value);
                  }
                }
              }}
              className="w-12 h-8 px-2 text-sm text-center bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:border-primary"
            />
            <span className="text-sm text-text-secondary">椤?/span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 涓荤粍浠?====================

/**
 * DataTable 浼佷笟绾ц〃鏍肩粍浠? *
 * 鍔熻兘鐗规€э細
 * - 鏁版嵁灞曠ず
 * - 鍒嗛〉鎺у埗
 * - 琛岄€夋嫨
 * - 鎺掑簭
 * - 鑷畾涔夋覆鏌? * - 鍔犺浇鐘舵€? * - 绌虹姸鎬? */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  dataSource,
  loading = false,
  emptyText = "鏆傛棤鏁版嵁",
  rowKey = "id" as keyof T,
  rowSelection,
  pagination,
  onSortChange,
  onRowClick,
  rowClassName,
  bordered = false,
  striped = true,
  size = "default",
  className,
  style,
}: DataTableProps<T>) {
  // 鑾峰彇琛屽敮涓€鏍囪瘑
  const getRowKey = useCallback(
    (record: T): string => {
      if (typeof rowKey === "function") {
        return rowKey(record);
      }
      return String(record[rowKey]);
    },
    [rowKey],
  );

  // 鎺掑簭鐘舵€?  const [sortState, setSortState] = useState<{
    field: string;
    order: "asc" | "desc" | null;
  }>({
    field: "",
    order: null,
  });

  // 澶勭悊鎺掑簭
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    let newOrder: "asc" | "desc" | null = "asc";
    if (sortState.field === column.key && sortState.order === "asc") {
      newOrder = "desc";
    } else if (sortState.field === column.key && sortState.order === "desc") {
      newOrder = null;
    }

    setSortState({ field: column.key, order: newOrder });
    onSortChange?.({ field: column.key, order: newOrder });
  };

  // 鑾峰彇鍗曞厓鏍煎€?  const getCellValue = (
    record: T,
    dataIndex: keyof T | string | undefined,
  ): unknown => {
    if (!dataIndex) return "";
    return record[dataIndex as keyof T];
  };

  // 鑾峰彇琛岀被鍚?  const getRowClassName = (record: T, index: number): string => {
    const classes: string[] = [];

    if (striped && index % 2 === 1) {
      classes.push("bg-bg-tertiary/30");
    }

    if (onRowClick) {
      classes.push("cursor-pointer hover:bg-bg-tertiary");
    }

    if (rowClassName) {
      if (typeof rowClassName === "function") {
        classes.push(rowClassName(record, index));
      } else {
        classes.push(rowClassName);
      }
    }

    return classes.join(" ");
  };

  // 灏哄鏍峰紡
  const sizeClasses = useMemo(() => {
    switch (size) {
      case "small":
        return "text-xs";
      case "large":
        return "text-base";
      default:
        return "text-sm";
    }
  }, [size]);

  const cellPaddingClasses = useMemo(() => {
    switch (size) {
      case "small":
        return "px-3 py-2";
      case "large":
        return "px-6 py-4";
      default:
        return "px-4 py-3";
    }
  }, [size]);

  return (
    <div className={`flex flex-col ${className || ""}`} style={style}>
      {/* 琛ㄦ牸瀹瑰櫒 */}
      <div className="overflow-x-auto">
        <table
          className={`w-full ${sizeClasses} ${bordered ? "border border-border" : ""}`}
        >
          {/* 琛ㄥご */}
          <thead className="bg-bg-secondary">
            <tr>
              {/* 閫夋嫨鍒?*/}
              {rowSelection && (
                <th
                  className={`${cellPaddingClasses} text-left font-medium text-text-secondary border-b border-border w-12`}
                >
                  {rowSelection.showSelectAll !== false && (
                    <input
                      type="checkbox"
                      checked={
                        rowSelection.selectedRowKeys?.length ===
                          dataSource.length && dataSource.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          rowSelection.onChange?.(dataSource.map(getRowKey), [
                            ...dataSource,
                          ]);
                        } else {
                          rowSelection.onChange?.([], []);
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-tertiary text-primary focus:ring-primary"
                    />
                  )}
                </th>
              )}

              {/* 鏁版嵁鍒?*/}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${cellPaddingClasses}
                    text-left font-medium text-text-secondary
                    border-b border-border
                    ${column.sortable ? "cursor-pointer select-none hover:text-text-primary" : ""}
                    ${column.align === "center" ? "text-center" : ""}
                    ${column.align === "right" ? "text-right" : ""}
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
                            sortState.field === column.key &&
                            sortState.order === "asc"
                              ? "text-primary"
                              : "text-text-muted"
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
                            sortState.field === column.key &&
                            sortState.order === "desc"
                              ? "text-primary"
                              : "text-text-muted"
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

          {/* 琛ㄤ綋 */}
          <tbody>
            {loading ? (
              // 鍔犺浇鐘舵€?              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
                    <span className="text-text-muted">鍔犺浇涓?..</span>
                  </div>
                </td>
              </tr>
            ) : dataSource.length === 0 ? (
              // 绌虹姸鎬?              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="text-text-muted">{emptyText}</div>
                </td>
              </tr>
            ) : (
              // 鏁版嵁琛?              dataSource.map((record, index) => {
                const key = getRowKey(record);
                const isSelected = rowSelection?.selectedRowKeys?.includes(key);

                return (
                  <tr
                    key={key}
                    className={`
                      ${getRowClassName(record, index)}
                      ${isSelected ? "bg-primary/10" : ""}
                      transition-colors
                    `}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {/* 閫夋嫨鍗曞厓鏍?*/}
                    {rowSelection && (
                      <td
                        className={`${cellPaddingClasses} border-b border-border`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const selectedKeys =
                              rowSelection.selectedRowKeys || [];
                            const selectedRows: T[] = [];

                            if (e.target.checked) {
                              const newKeys = [...selectedKeys, key];
                              rowSelection.onChange?.(newKeys, selectedRows);
                            } else {
                              const newKeys = selectedKeys.filter(
                                (k) => k !== key,
                              );
                              rowSelection.onChange?.(newKeys, selectedRows);
                            }
                          }}
                          className="w-4 h-4 rounded border-border bg-bg-tertiary text-primary focus:ring-primary"
                        />
                      </td>
                    )}

                    {/* 鏁版嵁鍗曞厓鏍?*/}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`
                          ${cellPaddingClasses}
                          border-b border-border
                          text-text-primary
                          ${column.align === "center" ? "text-center" : ""}
                          ${column.align === "right" ? "text-right" : ""}
                        `}
                      >
                        {column.render
                          ? column.render(
                              getCellValue(record, column.dataIndex),
                              record,
                              index,
                            )
                          : String(
                              getCellValue(record, column.dataIndex) ?? "",
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 鍒嗛〉 */}
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

