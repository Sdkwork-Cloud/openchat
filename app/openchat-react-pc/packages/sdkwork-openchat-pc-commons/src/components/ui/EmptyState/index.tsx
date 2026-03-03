/**
 * EmptyState 绌虹姸鎬佺粍浠? *
 * 鑱岃矗锛氬湪鏁版嵁涓虹┖鏃舵彁渚涘弸濂界殑瑙嗚鍙嶉
 * 鐗规€э細
 * - 绮剧編鐨勬彃鐢婚鏍? * - 鍙嚜瀹氫箟鍥炬爣銆佹爣棰樸€佹弿杩? * - 鏀寔鎿嶄綔鎸夐挳
 */

import React from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../Button";

// ==================== 绫诲瀷瀹氫箟 ====================

export interface EmptyStateProps {
  /** 鍥炬爣 */
  icon?: React.ReactNode;
  /** 鏍囬 */
  title?: string;
  /** 鎻忚堪 */
  description?: string;
  /** 鎿嶄綔鎸夐挳 */
  action?: React.ReactNode;
  /** 灏哄 */
  size?: "small" | "medium" | "large";
  /** 鑷畾涔夌被鍚?*/
  className?: string;
}

// ==================== 棰勮鍥炬爣 ====================

const EmptyIcon: React.FC<{
  type?: "default" | "search" | "message" | "file";
}> = ({ type = "default" }) => {
  const icons = {
    default: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        <circle cx="45" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <circle cx="75" cy="50" r="8" fill="currentColor" opacity="0.4" />
        <path
          d="M40 75 Q60 90 80 75"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    search: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="55"
          cy="55"
          r="30"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.3"
        />
        <path
          d="M78 78 L95 95"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle
          cx="55"
          cy="55"
          r="20"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
      </svg>
    ),
    message: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="20"
          y="30"
          width="80"
          height="60"
          rx="8"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M35 50 H85 M35 65 H65"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path d="M50 90 L60 80 L70 90" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    file: (
      <svg
        className="w-full h-full"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M35 20 H70 L90 40 V100 H35 V20 Z"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M70 20 V40 H90"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M45 55 H80 M45 70 H80 M45 85 H60"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.2"
        />
      </svg>
    ),
  };

  return icons[type] || icons.default;
};

// ==================== 缁勪欢瀹炵幇 ====================

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = "鏆傛棤鏁版嵁",
  description = "褰撳墠鍒楄〃涓虹┖",
  action,
  size = "medium",
  className,
}) => {
  const sizeClasses = {
    small: {
      container: "py-8",
      icon: "w-16 h-16",
      title: "text-base",
      description: "text-sm",
    },
    medium: {
      container: "py-12",
      icon: "w-24 h-24",
      title: "text-lg",
      description: "text-base",
    },
    large: {
      container: "py-16",
      icon: "w-32 h-32",
      title: "text-xl",
      description: "text-lg",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        currentSize.container,
        className,
      )}
    >
      {/* 鍥炬爣 */}
      <div className={cn("text-text-muted mb-4", currentSize.icon)}>
        {icon || <EmptyIcon />}
      </div>

      {/* 鏍囬 */}
      <h3
        className={cn("font-medium text-text-primary mb-2", currentSize.title)}
      >
        {title}
      </h3>

      {/* 鎻忚堪 */}
      <p
        className={cn("text-text-secondary max-w-xs", currentSize.description)}
      >
        {description}
      </p>

      {/* 鎿嶄綔鎸夐挳 */}
      {action && <div className="mt-6 animate-slideUp">{action}</div>}
    </div>
  );
};

// ==================== 棰勮绌虹姸鎬?====================

export const EmptySearch: React.FC<{
  keyword?: string;
  onClear?: () => void;
}> = ({ keyword, onClear }) => (
  <EmptyState
    icon={<EmptyIcon type="search" />}
    title={keyword ? `鏈壘鍒?"${keyword}" 鐩稿叧缁撴灉` : "鏃犳悳绱㈢粨鏋?}
    description="璇峰皾璇曚娇鐢ㄥ叾浠栧叧閿瘝鎼滅储"
    action={
      onClear && (
        <Button variant="primary" onClick={onClear}>
          娓呴櫎鎼滅储
        </Button>
      )
    }
  />
);

export const EmptyChat: React.FC<{ onStartChat?: () => void }> = ({
  onStartChat,
}) => (
  <EmptyState
    icon={<EmptyIcon type="message" />}
    title="寮€濮嬫柊鐨勫璇?
    description="閫夋嫨涓€涓仈绯讳汉鎴栫兢缁勫紑濮嬭亰澶?
    action={
      onStartChat && (
        <Button variant="primary" onClick={onStartChat}>
          鏂板缓瀵硅瘽
        </Button>
      )
    }
  />
);

export const EmptyFile: React.FC<{ onUpload?: () => void }> = ({
  onUpload,
}) => (
  <EmptyState
    icon={<EmptyIcon type="file" />}
    title="鏆傛棤鏂囦欢"
    description="鐐瑰嚮涓婁紶鎸夐挳娣诲姞鏂囦欢"
    action={
      onUpload && (
        <Button variant="primary" onClick={onUpload}>
          涓婁紶鏂囦欢
        </Button>
      )
    }
  />
);

export default EmptyState;

