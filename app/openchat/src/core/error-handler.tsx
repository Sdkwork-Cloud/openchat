/**
 * 错误处理和错误边界
 * 统一的错误处理、错误展示、重试机制
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/Toast';

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface ErrorContextValue {
  errors: ErrorInfo[];
  addError: (error: ErrorInfo | string) => void;
  removeError: (code: string) => void;
  clearErrors: () => void;
  retry: (action: () => Promise<void>) => Promise<void>;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

interface ErrorProviderProps {
  children: ReactNode;
  onError?: (error: ErrorInfo) => void;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children, onError }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = useCallback((error: ErrorInfo | string) => {
    const errorInfo: ErrorInfo = typeof error === 'string'
      ? { code: 'UNKNOWN', message: error, timestamp: Date.now() }
      : error;

    setErrors(prev => [...prev, errorInfo]);
    
    Toast.error(errorInfo.message);
    
    if (onError) {
      onError(errorInfo);
    }
  }, [onError]);

  const removeError = useCallback((code: string) => {
    setErrors(prev => prev.filter(e => e.code !== code));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const retry = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      addError(error as any);
      throw error;
    }
  }, [addError]);

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors, retry }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
};

export const useErrorHandler = () => {
  const { addError } = useError();

  return useCallback((error: any) => {
    const errorInfo: ErrorInfo = {
      code: error?.code || error?.status?.toString() || 'UNKNOWN',
      message: error?.message || error?.msg || 'An error occurred',
      details: error?.details || error?.data,
      timestamp: Date.now(),
    };

    addError(errorInfo);
    console.error('[Error]', errorInfo);
  }, [addError]);
};

export class ErrorHandler {
  static handleApiError(error: any): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code: error?.code || error?.status?.toString() || 'API_ERROR',
      message: error?.message || error?.msg || 'API request failed',
      details: error?.details || error?.data,
      timestamp: Date.now(),
    };

    console.error('[API Error]', errorInfo);
    return errorInfo;
  }

  static handleNetworkError(error: any): ErrorInfo {
    return {
      code: 'NETWORK_ERROR',
      message: error?.message || 'Network connection failed',
      details: error,
      timestamp: Date.now(),
    };
  }

  static handleValidationError(error: any): ErrorInfo {
    const messages = error?.details || error?.errors || [];
    return {
      code: 'VALIDATION_ERROR',
      message: Array.isArray(messages) 
        ? messages.map((m: any) => m.message || m).join(', ')
        : 'Validation failed',
      details: error,
      timestamp: Date.now(),
    };
  }

  static isAuthError(error: any): boolean {
    const code = error?.code || error?.status;
    return code === 401 || code === 'UNAUTHORIZED' || code === 'AUTH_ERROR';
  }

  static isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || error?.status === 0;
  }

  static isValidationError(error: any): boolean {
    return error?.code === 'VALIDATION_ERROR' || error?.status === 400;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
