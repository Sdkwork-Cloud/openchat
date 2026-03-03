/**
 * 閿欒杈圭晫缁勪欢
 *
 * 鑱岃矗锛氭崟鑾?React 缁勪欢鏍戜腑鐨勯敊璇紝闃叉搴旂敤宕╂簝
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 閿欒杈圭晫缁勪欢
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    this.setState({ errorInfo });

    // 璋冪敤澶栭儴閿欒澶勭悊
    this.props.onError?.(error, errorInfo);

    // 涓婃姤閿欒锛堢敓浜х幆澧冿級
    if (import.meta.env.MODE === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // 褰?resetKeys 鍙樺寲鏃堕噸缃敊璇姸鎬?    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  /**
   * 涓婃姤閿欒
   */
  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 杩欓噷鍙互鎺ュ叆閿欒涓婃姤鏈嶅姟锛堝 Sentry锛?    console.error('[ErrorBoundary] Report error:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 閲嶇疆閿欒鐘舵€?   */
  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 鑷畾涔?fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 榛樿閿欒 UI
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

/**
 * 榛樿閿欒闄嶇骇 UI
 */
function DefaultErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <div className="max-w-md w-full bg-[#1E293B] rounded-xl p-6 border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-center w-16 h-16 bg-[rgba(239,68,68,0.1)] rounded-full mb-4 mx-auto">
          <svg
            className="w-8 h-8 text-[#EF4444]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-[#F8FAFC] text-center mb-2">
          鍑洪敊浜?        </h2>

        <p className="text-[#94A3B8] text-center mb-4">
          搴旂敤閬囧埌浜嗕竴浜涢棶棰橈紝璇峰皾璇曞埛鏂伴〉闈?        </p>

        {import.meta.env.MODE === 'development' && error && (
          <div className="bg-[#0F172A] rounded-lg p-3 mb-4 overflow-auto">
            <p className="text-[#EF4444] text-sm font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg transition-colors"
          >
            閲嶈瘯
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
          >
            鍒锋柊椤甸潰
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;

