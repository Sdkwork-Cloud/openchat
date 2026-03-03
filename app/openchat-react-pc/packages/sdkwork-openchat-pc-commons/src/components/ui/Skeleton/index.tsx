/**
 * Skeleton 楠ㄦ灦灞忕粍浠? *
 * 鑱岃矗锛氬湪鍐呭鍔犺浇鏃舵彁渚涜瑙夊崰浣嶏紝鎻愬崌鎰熺煡鎬ц兘
 * 鐗规€э細
 * - Shimmer 娴佸厜鍔ㄧ敾鏁堟灉
 * - 澶氱棰勮甯冨眬锛堟枃鏈€佸ご鍍忋€佸崱鐗囥€佸垪琛級
 * - 鍙嚜瀹氫箟灏哄鍜屽舰鐘? */

import React from "react";
import { cn } from "../../../utils/cn";

// ==================== 绫诲瀷瀹氫箟 ====================

export interface SkeletonProps {
  /** 瀹藉害 */
  width?: string | number;
  /** 楂樺害 */
  height?: string | number;
  /** 鍦嗚 */
  borderRadius?: string | number;
  /** 鏄惁鏄剧ず shimmer 鍔ㄧ敾 */
  shimmer?: boolean;
  /** 鑷畾涔夌被鍚?*/
  className?: string;
  /** 琛屾暟锛堢敤浜庡琛岄鏋跺睆锛?*/
  rows?: number;
  /** 琛岄棿璺?*/
  rowGap?: number;
  /** 灏哄锛堢敤浜庡ご鍍忕瓑锛?*/
  size?: number;
}

// ==================== 鍩虹楠ㄦ灦灞?====================

/**
 * 鍩虹楠ㄦ灦灞忕粍浠? */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 4,
  shimmer = true,
  className,
}) => {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius:
      typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={cn("bg-bg-tertiary", shimmer && "skeleton-shimmer", className)}
      style={style}
    />
  );
};

// ==================== 棰勮甯冨眬 ====================

/**
 * 鏂囨湰楠ㄦ灦灞? */
export const SkeletonText: React.FC<
  Omit<SkeletonProps, "height"> & { lines?: number }
> = ({ lines = 3, width = "100%", shimmer = true, className, rowGap = 8 }) => {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap: rowGap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "60%" : width}
          height={16}
          borderRadius={4}
          shimmer={shimmer}
        />
      ))}
    </div>
  );
};

/**
 * 澶村儚楠ㄦ灦灞? */
export const SkeletonAvatar: React.FC<SkeletonProps> = ({
  size = 40,
  shimmer = true,
  className,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      shimmer={shimmer}
      className={className}
    />
  );
};

/**
 * 鍗＄墖楠ㄦ灦灞? */
export const SkeletonCard: React.FC<SkeletonProps> = ({
  shimmer = true,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-4 bg-bg-secondary rounded-lg border border-border",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={48} shimmer={shimmer} />
        <div className="flex-1 min-w-0">
          <Skeleton
            width="40%"
            height={20}
            borderRadius={4}
            shimmer={shimmer}
            className="mb-2"
          />
          <SkeletonText lines={2} shimmer={shimmer} />
        </div>
      </div>
    </div>
  );
};

/**
 * 娑堟伅楠ㄦ灦灞? */
export const SkeletonMessage: React.FC<{
  isSelf?: boolean;
  shimmer?: boolean;
}> = ({ isSelf = false, shimmer = true }) => {
  return (
    <div className={cn("flex gap-3", isSelf ? "flex-row-reverse" : "flex-row")}>
      <SkeletonAvatar size={36} shimmer={shimmer} />
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isSelf ? "items-end" : "items-start",
        )}
      >
        <Skeleton
          width={60}
          height={14}
          borderRadius={4}
          shimmer={shimmer}
          className="mb-1"
        />
        <div
          className={cn(
            "px-4 py-2 rounded-2xl",
            isSelf
              ? "bg-primary rounded-br-sm"
              : "bg-bg-tertiary rounded-bl-sm",
          )}
        >
          <Skeleton
            width={200}
            height={16}
            borderRadius={4}
            shimmer={shimmer}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * 鍒楄〃椤归鏋跺睆
 */
export const SkeletonListItem: React.FC<{ shimmer?: boolean }> = ({
  shimmer = true,
}) => {
  return (
    <div className="flex items-center gap-3 p-3">
      <SkeletonAvatar size={40} shimmer={shimmer} />
      <div className="flex-1 min-w-0">
        <Skeleton
          width="50%"
          height={16}
          borderRadius={4}
          shimmer={shimmer}
          className="mb-2"
        />
        <Skeleton width="80%" height={12} borderRadius={4} shimmer={shimmer} />
      </div>
      <Skeleton width={40} height={12} borderRadius={4} shimmer={shimmer} />
    </div>
  );
};

/**
 * 鑱婂ぉ鍒楄〃楠ㄦ灦灞? */
export const SkeletonChatList: React.FC<{ count?: number }> = ({
  count = 8,
}) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </div>
  );
};

/**
 * 娑堟伅鍒楄〃楠ㄦ灦灞? */
export const SkeletonMessageList: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonMessage key={index} isSelf={index % 3 === 1} />
      ))}
    </div>
  );
};

export default Skeleton;

