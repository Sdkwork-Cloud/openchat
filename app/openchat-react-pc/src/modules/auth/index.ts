/**
 * 认证模块入口 - 完整版
 *
 * 导出：
 * 1. 实体类型
 * 2. Hooks
 * 3. 页面组件
 * 4. 服务（基于SDK实现）
 *
 * 注意：所有认证操作都通过OpenChat TypeScript SDK实现
 */

// 实体
export type {
  User,
  IMConfig,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  AuthState,
  PasswordStrength,
} from './entities/auth.entity';

// Hooks
export { useAuth, type UseAuthReturn } from './hooks/useAuth';

// 页面
export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { AuthPage } from './pages/AuthPage';

// 服务（基于SDK实现）
export * from './services';
