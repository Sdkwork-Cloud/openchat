import { IS_DEV, apiClient } from "@sdkwork/openchat-pc-kernel";
import type {
  ForgotPasswordResponse,
  IMConfig,
  LoginResponse,
  PasswordStrength,
  RegisterRequest,
  RegisterResponse,
  StoredAuthData,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  User,
} from "../entities/auth.entity";
import { destroySDK, initializeSDK, isSDKInitialized } from "./sdk-adapter";

/**
 * Send verification code request.
 */
export interface SendVerificationCodeRequest {
  email?: string;
  phone?: string;
  type: "register" | "forgot-password";
}

/**
 * Verify verification code request.
 */
export interface VerifyVerificationCodeRequest {
  email?: string;
  phone?: string;
  code: string;
  type: "register" | "forgot-password";
}

/**
 * Register by phone request.
 */
export interface PhoneRegisterRequest {
  phone: string;
  code: string;
  username: string;
  password: string;
  nickname: string;
}

/**
 * Register by email request.
 */
export interface EmailRegisterRequest {
  email: string;
  code: string;
  username: string;
  password: string;
  nickname: string;
}

const AUTH_STORAGE_KEY = "openchat_auth_data";
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAINLAND_CHINA_PHONE_PATTERN = /^1[3-9]\d{9}$/;
const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_APP_API_BASE_URL as string | undefined) ||
  ""
).trim();
const DEFAULT_HTTP_BASE = API_BASE_URL || "http://localhost:3000";
const SDK_API_PREFIX = "/app/v3/api";
const SDK_AUTH_BASE = `${SDK_API_PREFIX}/auth`;
const SDK_USER_BASE = `${SDK_API_PREFIX}/user`;
const SDK_LOGIN_PATH = `${SDK_AUTH_BASE}/login`;
const SDK_REGISTER_PATH = `${SDK_AUTH_BASE}/register`;
const SDK_LOGOUT_PATH = `${SDK_AUTH_BASE}/logout`;
const SDK_REFRESH_PATH = `${SDK_AUTH_BASE}/refresh`;
const SDK_PASSWORD_CHANGE_PATH = `${SDK_USER_BASE}/password`;
const SDK_PASSWORD_RESET_REQUEST_PATH = `${SDK_AUTH_BASE}/password/reset/request`;
const SDK_SMS_SEND_PATH = `${SDK_AUTH_BASE}/sms/send`;
const SDK_SMS_VERIFY_PATH = `${SDK_AUTH_BASE}/sms/verify`;
const MAX_AUTH_AGE_MS = 7 * 24 * 60 * 60 * 1000;
type VerificationFlowType = "REGISTER" | "RESET_PASSWORD";

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readStringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeToken(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function unwrapApiPayload(payload: unknown): Record<string, unknown> | null {
  const object = asObject(payload);
  if (!object) {
    return null;
  }
  const nested = asObject(object.data);
  return nested || object;
}

function normalizeUser(value: unknown): User | null {
  const userObject = asObject(value);
  if (!userObject) {
    return null;
  }

  const id = readStringField(userObject.id) || readStringField(userObject.uid);
  const username = readStringField(userObject.username);
  if (!id || !username) {
    return null;
  }

  return {
    id,
    uid: readStringField(userObject.uid) || id,
    username,
    email: readStringField(userObject.email) || "",
    phone: readStringField(userObject.phone) || "",
    nickname: readStringField(userObject.nickname) || username,
    avatar: readStringField(userObject.avatar),
    status: readStringField(userObject.status),
  };
}

function resolveTokenFields(source: Record<string, unknown>): {
  authToken: string | null;
  accessToken: string | null;
  refreshToken?: string;
} {
  const authToken = normalizeToken(
    readStringField(source.authToken) ||
      readStringField(source.token) ||
      readStringField(source.accessToken),
  );
  const accessToken = normalizeToken(
    readStringField(source.accessToken) || readStringField(source.token) || authToken,
  );

  return {
    authToken,
    accessToken,
    refreshToken: normalizeToken(readStringField(source.refreshToken)) || undefined,
  };
}

function resolveImConfig(
  value: unknown,
  fallbackUid: string,
  fallbackToken: string,
): IMConfig | null {
  const configObject = asObject(value);
  if (!configObject) {
    return {
      wsUrl:
        (import.meta.env.VITE_IM_WS_URL as string | undefined) ||
        (import.meta.env.VITE_APP_IM_WS_URL as string | undefined) ||
        "ws://localhost:5200",
      serverUrl: API_BASE_URL || undefined,
      uid: fallbackUid,
      token: fallbackToken,
    };
  }

  const wsUrl = readStringField(configObject.wsUrl);
  const uid = readStringField(configObject.uid) || fallbackUid;
  const token = readStringField(configObject.token) || fallbackToken;
  if (!wsUrl || !uid || !token) {
    return null;
  }

  return {
    wsUrl,
    uid,
    token,
    serverUrl: readStringField(configObject.serverUrl),
    deviceId: readStringField(configObject.deviceId),
    deviceFlag: readStringField(configObject.deviceFlag),
  };
}

function persistTokenCache(data: StoredAuthData): void {
  if (!hasLocalStorage()) {
    return;
  }

  const authToken = normalizeToken(data.authToken || data.token);
  const accessToken = normalizeToken(data.accessToken || authToken);
  const imToken = normalizeToken(data.imToken || data.imConfig.token);

  if (data.imConfig.uid) {
    localStorage.setItem("uid", data.imConfig.uid);
  } else {
    localStorage.removeItem("uid");
  }

  if (imToken) {
    localStorage.setItem("token", imToken);
    localStorage.setItem("im_token", imToken);
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("im_token");
  }

  if (authToken) {
    localStorage.setItem("auth_token", authToken);
  } else {
    localStorage.removeItem("auth_token");
  }

  if (accessToken) {
    localStorage.setItem("access_token", accessToken);
  } else {
    localStorage.removeItem("access_token");
  }
}

function clearTokenCache(): void {
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.removeItem("uid");
  localStorage.removeItem("token");
  localStorage.removeItem("im_token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("access_token");
}

function resolveResponseMessage(payload: unknown, fallbackMessage: string): string {
  const object = asObject(payload);
  if (!object) {
    return fallbackMessage;
  }
  return (
    readStringField(object.message) ||
    readStringField(object.msg) ||
    readStringField(object.error) ||
    fallbackMessage
  );
}

function ensureResponseSuccess(payload: unknown, fallbackMessage: string): void {
  const object = asObject(payload);
  if (!object) {
    return;
  }

  const code = readStringField(object.code);
  if (code && code !== "2000") {
    throw new Error(resolveResponseMessage(payload, fallbackMessage));
  }

  if (typeof object.success === "boolean" && !object.success) {
    throw new Error(resolveResponseMessage(payload, fallbackMessage));
  }
}

function mapVerificationFlowType(type: "register" | "forgot-password"): VerificationFlowType {
  if (type === "forgot-password") {
    return "RESET_PASSWORD";
  }
  return "REGISTER";
}

function buildMockLoginResponse(username: string): LoginResponse {
  const userId = `user_${Math.floor(Math.random() * 10_000_000)}`;
  const safeUsername = username.trim() || "demo";
  const authToken = `mock_jwt_${Date.now()}`;
  return {
    user: {
      id: userId,
      uid: userId,
      username: safeUsername,
      nickname: `User ${safeUsername}`,
      avatar: "",
      status: "online",
      email: safeUsername.includes("@") ? safeUsername : `${safeUsername}@example.com`,
      phone: "13800138000",
    },
    token: authToken,
    authToken,
    accessToken: authToken,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresIn: 3600,
    imConfig: {
      wsUrl:
        (import.meta.env.VITE_IM_WS_URL as string | undefined) ||
        (import.meta.env.VITE_APP_IM_WS_URL as string | undefined) ||
        "ws://localhost:5200",
      serverUrl: API_BASE_URL || undefined,
      uid: userId,
      token: `mock_im_token_${Date.now()}`,
    },
  };
}

function createAuthStorageData(payload: LoginResponse): StoredAuthData {
  const authToken = normalizeToken(payload.authToken || payload.token) || "";
  const accessToken = normalizeToken(payload.accessToken || payload.token) || authToken;
  const imToken = normalizeToken(payload.imConfig.token) || accessToken || authToken;

  return {
    user: payload.user,
    token: authToken,
    authToken,
    accessToken,
    imToken: imToken || undefined,
    refreshToken: payload.refreshToken,
    imConfig: {
      ...payload.imConfig,
      token: imToken || payload.imConfig.token,
    },
    timestamp: Date.now(),
  };
}

async function callLoginApi(username: string, password: string): Promise<LoginResponse> {
  if (IS_DEV) {
    return buildMockLoginResponse(username);
  }

  const payload = await apiClient.post<unknown>(SDK_LOGIN_PATH, { username, password });
  ensureResponseSuccess(payload, "Login failed.");
  const object = unwrapApiPayload(payload);
  if (!object) {
    throw new Error("Unexpected login response.");
  }

  const user = normalizeUser(object.user || object.userInfo || object);
  const { authToken, accessToken, refreshToken } = resolveTokenFields(object);
  const primaryToken = authToken || accessToken;
  if (!user || !primaryToken) {
    throw new Error("Login response is incomplete.");
  }

  const imConfig = resolveImConfig(object.imConfig, user.uid || user.id, primaryToken);
  if (!imConfig) {
    throw new Error("IM configuration is incomplete.");
  }

  return {
    user,
    token: primaryToken,
    authToken: authToken || primaryToken,
    accessToken: accessToken || primaryToken,
    refreshToken,
    expiresIn: typeof object.expiresIn === "number" ? object.expiresIn : undefined,
    imConfig,
  };
}

async function callRegisterApi(request: RegisterRequest): Promise<void> {
  if (IS_DEV) {
    return;
  }

  const payload = await apiClient.post<unknown>(SDK_REGISTER_PATH, {
    username: request.username,
    password: request.password,
    confirmPassword: request.confirmPassword,
    email: request.email || undefined,
    phone: request.phone || undefined,
  });
  ensureResponseSuccess(payload, "Register failed.");
}

export function loadAuthData(): StoredAuthData | null {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredAuthData>;
    if (!parsed.user || !parsed.imConfig) {
      return null;
    }

    const authToken =
      normalizeToken(parsed.authToken || parsed.token) ||
      normalizeToken(localStorage.getItem("auth_token"));
    const accessToken =
      normalizeToken(parsed.accessToken || authToken) ||
      normalizeToken(localStorage.getItem("access_token")) ||
      authToken;
    const imToken =
      normalizeToken(parsed.imToken || parsed.imConfig.token) ||
      normalizeToken(localStorage.getItem("im_token")) ||
      normalizeToken(localStorage.getItem("token")) ||
      accessToken ||
      authToken;

    if (!authToken || !imToken) {
      return null;
    }

    return {
      user: parsed.user,
      token: authToken,
      authToken,
      accessToken: accessToken || authToken,
      imToken,
      refreshToken: parsed.refreshToken,
      imConfig: {
        ...parsed.imConfig,
        token: imToken,
      },
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveAuthData(data: StoredAuthData): void {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    persistTokenCache(data);
  } catch {
    // Ignore local storage failure.
  }
}

export function clearAuthData(): void {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    clearTokenCache();
  } catch {
    // Ignore local storage failure.
  }
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }
  if (password.length >= 12) {
    score += 1;
  }
  if (password.length > 100) {
    errors.push("Password must be 100 characters or fewer.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter.");
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter.");
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push("Password must include a number.");
  } else {
    score += 1;
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must include a special character (@$!%*?&).");
  } else {
    score += 1;
  }

  if (password.length < 12) {
    suggestions.push("Use 12 or more characters for better security.");
  }
  if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
    suggestions.push("Consider adding extra symbol types.");
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
    suggestions,
  };
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username.trim()) {
    return { isValid: false, error: "Username is required." };
  }
  if (username.length < 3) {
    return { isValid: false, error: "Username must be at least 3 characters." };
  }
  if (username.length > 50) {
    return { isValid: false, error: "Username must be 50 characters or fewer." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      isValid: false,
      error: "Username only supports letters, numbers, underscore, and hyphen.",
    };
  }
  return { isValid: true };
}

export function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  if (!nickname.trim()) {
    return { isValid: false, error: "Nickname is required." };
  }
  if (nickname.length > 100) {
    return { isValid: false, error: "Nickname must be 100 characters or fewer." };
  }
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required." };
  }
  if (email.length > 100) {
    return { isValid: false, error: "Email must be 100 characters or fewer." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { isValid: false, error: "Invalid email format." };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone.trim()) {
    return { isValid: false, error: "Phone number is required." };
  }
  if (phone.length > 20) {
    return { isValid: false, error: "Phone number must be 20 characters or fewer." };
  }
  if (!MAINLAND_CHINA_PHONE_PATTERN.test(phone)) {
    return { isValid: false, error: "Invalid phone number format." };
  }
  return { isValid: true };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  if (!username.trim()) {
    throw new Error("Username is required.");
  }
  if (!password.trim()) {
    throw new Error("Password is required.");
  }

  if (isSDKInitialized()) {
    destroySDK();
  }

  try {
    const response = await callLoginApi(username.trim(), password);
    await initializeSDK({
      apiBaseUrl: DEFAULT_HTTP_BASE,
      imWsUrl: response.imConfig.wsUrl,
      uid: response.imConfig.uid,
      token: response.imConfig.token,
    });

    const authData = createAuthStorageData(response);
    saveAuthData(authData);
    persistTokenCache(authData);

    return response;
  } catch (error) {
    destroySDK();
    throw error;
  }
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const usernameValidation = validateUsername(request.username);
  if (!usernameValidation.isValid) {
    return { success: false, error: usernameValidation.error };
  }

  const email = request.email?.trim() || "";
  const phone = request.phone?.trim() || "";
  if (!email && !phone) {
    return { success: false, error: "Email or phone is required." };
  }

  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return { success: false, error: emailValidation.error };
    }
  }

  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.error };
    }
  }

  const nicknameValidation = validateNickname(request.nickname);
  if (!nicknameValidation.isValid) {
    return { success: false, error: nicknameValidation.error };
  }

  const passwordValidation = validatePasswordStrength(request.password);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors[0] };
  }

  if (request.password !== request.confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  if (isSDKInitialized()) {
    destroySDK();
  }

  try {
    await callRegisterApi(request);
    const loginResponse = await login(request.username, request.password);
    return {
      success: true,
      user: loginResponse.user,
      token: loginResponse.token,
    };
  } catch (error) {
    destroySDK();
    return {
      success: false,
      error: error instanceof Error ? error.message : "Register failed.",
    };
  }
}

export async function forgotPassword(
  email?: string,
  phone?: string,
): Promise<ForgotPasswordResponse> {
  const normalizedEmail = email?.trim();
  const normalizedPhone = phone?.trim();
  if (!normalizedEmail && !normalizedPhone) {
    return { success: false, error: "Email or phone is required." };
  }

  if (IS_DEV) {
    return {
      success: true,
      message: normalizedEmail
        ? "Reset link has been sent to your email."
        : "Reset code has been sent to your phone.",
    };
  }

  try {
    const payload = await apiClient.post<unknown>(SDK_PASSWORD_RESET_REQUEST_PATH, {
      account: normalizedEmail || normalizedPhone || "",
      channel: normalizedEmail ? "EMAIL" : "SMS",
    });
    ensureResponseSuccess(payload, "Failed to request password reset.");

    return {
      success: true,
      message: resolveResponseMessage(
        payload,
        normalizedEmail
          ? "Reset link has been sent to your email."
          : "Reset code has been sent to your phone.",
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to request password reset.",
    };
  }
}

export async function updatePassword(
  request: UpdatePasswordRequest,
  currentToken: string,
): Promise<UpdatePasswordResponse> {
  if (!request.oldPassword.trim()) {
    return { success: false, error: "Current password is required." };
  }

  const strength = validatePasswordStrength(request.newPassword);
  if (!strength.isValid) {
    return { success: false, error: strength.errors[0] };
  }

  if (request.newPassword !== request.confirmPassword) {
    return { success: false, error: "New password and confirmation do not match." };
  }

  if (IS_DEV) {
    return { success: true };
  }

  try {
    const payload = await apiClient.put<unknown>(
      SDK_PASSWORD_CHANGE_PATH,
      {
        oldPassword: request.oldPassword,
        newPassword: request.newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Access-Token": currentToken,
        },
      },
    );
    ensureResponseSuccess(payload, "Failed to update password.");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update password.",
    };
  }
}

export async function logout(): Promise<void> {
  const authData = loadAuthData();

  try {
    if (!IS_DEV && authData?.token) {
      await apiClient.post<unknown>(SDK_LOGOUT_PATH, undefined, {
        headers: {
          Authorization: `Bearer ${authData.token}`,
          ...(authData.accessToken ? { "Access-Token": authData.accessToken } : undefined),
        },
      });
    }
  } catch {
    // Ignore logout request failure.
  } finally {
    destroySDK();
    clearAuthData();
  }
}

export function isAuthenticated(): boolean {
  return Boolean(loadAuthData());
}

export function getCurrentUser(): User | null {
  return loadAuthData()?.user || null;
}

export function getIMConfig(): IMConfig | null {
  return loadAuthData()?.imConfig || null;
}

export function getToken(): string | null {
  return loadAuthData()?.token || null;
}

export async function restoreAuth(): Promise<LoginResponse | null> {
  const authData = loadAuthData();
  if (!authData) {
    return null;
  }

  if (Date.now() - authData.timestamp > MAX_AUTH_AGE_MS) {
    clearAuthData();
    return null;
  }

  try {
    await initializeSDK({
      apiBaseUrl: DEFAULT_HTTP_BASE,
      imWsUrl: authData.imConfig.wsUrl,
      uid: authData.imConfig.uid,
      token: authData.imConfig.token,
    });

    return {
      user: authData.user,
      token: authData.token,
      authToken: authData.authToken || authData.token,
      accessToken: authData.accessToken || authData.token,
      refreshToken: authData.refreshToken,
      imConfig: authData.imConfig,
    };
  } catch {
    clearAuthData();
    return null;
  }
}

export async function refreshToken(): Promise<string | null> {
  const authData = loadAuthData();
  if (!authData?.token) {
    return null;
  }

  if (IS_DEV) {
    const nextToken = `mock_jwt_${Date.now()}`;
    saveAuthData({
      ...authData,
      token: nextToken,
      authToken: nextToken,
      accessToken: nextToken,
      timestamp: Date.now(),
    });
    return nextToken;
  }

  try {
    const payload = await apiClient.post<unknown>(
      SDK_REFRESH_PATH,
      authData.refreshToken ? { refreshToken: authData.refreshToken } : undefined,
      {
        headers: {
          Authorization: `Bearer ${authData.token}`,
          ...(authData.accessToken ? { "Access-Token": authData.accessToken } : undefined),
        },
      },
    );
    ensureResponseSuccess(payload, "Failed to refresh token.");

    const object = unwrapApiPayload(payload);
    if (!object) {
      return null;
    }
    const { authToken, accessToken, refreshToken } = resolveTokenFields(object);
    const token = authToken || accessToken;
    if (!token) {
      return null;
    }

    saveAuthData({
      ...authData,
      token,
      authToken: authToken || token,
      accessToken: accessToken || token,
      refreshToken: refreshToken || authData.refreshToken,
      timestamp: Date.now(),
    });
    return token;
  } catch {
    return null;
  }
}

export async function loginWithThirdParty(provider: string): Promise<LoginResponse> {
  const normalizedProvider = provider.trim().toLowerCase();
  if (!normalizedProvider) {
    throw new Error("Provider is required.");
  }

  const mock = buildMockLoginResponse(`${normalizedProvider}_user`);
  mock.user.nickname = `${normalizedProvider} user`;
  mock.user.email = `${normalizedProvider}@example.com`;
  mock.user.phone = "13800138000";

  await initializeSDK({
    apiBaseUrl: DEFAULT_HTTP_BASE,
    imWsUrl: mock.imConfig.wsUrl,
    uid: mock.imConfig.uid,
    token: mock.imConfig.token,
  });

  saveAuthData(createAuthStorageData(mock));
  persistTokenCache(createAuthStorageData(mock));
  return mock;
}

export async function sendVerificationCode(
  email?: string,
  phone?: string,
  type: "register" | "forgot-password" = "register",
): Promise<{ success: boolean; message?: string; error?: string }> {
  const normalizedEmail = email?.trim();
  const normalizedPhone = phone?.trim();
  if (!normalizedEmail && !normalizedPhone) {
    return { success: false, error: "Email or phone is required." };
  }

  if (IS_DEV) {
    return { success: true, message: "Verification code sent." };
  }

  try {
    const payload = await apiClient.post<unknown>(SDK_SMS_SEND_PATH, {
      target: normalizedEmail || normalizedPhone || "",
      type: mapVerificationFlowType(type),
      verifyType: normalizedEmail ? "EMAIL" : "PHONE",
    });
    ensureResponseSuccess(payload, "Failed to send verification code.");
    return {
      success: true,
      message: resolveResponseMessage(payload, "Verification code sent."),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send verification code.",
    };
  }
}

export async function verifyVerificationCode(
  email?: string,
  phone?: string,
  code?: string,
  type: "register" | "forgot-password" = "register",
): Promise<{ success: boolean; message?: string; error?: string }> {
  const normalizedEmail = email?.trim();
  const normalizedPhone = phone?.trim();
  if (!normalizedEmail && !normalizedPhone) {
    return { success: false, error: "Email or phone is required." };
  }
  if (!code?.trim()) {
    return { success: false, error: "Verification code is required." };
  }

  if (IS_DEV) {
    return { success: true, message: "Verification code validated." };
  }

  try {
    const payload = await apiClient.post<unknown>(SDK_SMS_VERIFY_PATH, {
      target: normalizedEmail || normalizedPhone || "",
      type: mapVerificationFlowType(type),
      verifyType: normalizedEmail ? "EMAIL" : "PHONE",
      code: code.trim(),
    });
    ensureResponseSuccess(payload, "Invalid verification code.");
    const result = unwrapApiPayload(payload);
    const resultObject = asObject(result);
    if (resultObject && typeof resultObject.valid === "boolean" && !resultObject.valid) {
      return { success: false, error: "Invalid verification code." };
    }
    return {
      success: true,
      message: resolveResponseMessage(payload, "Verification code validated."),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed.",
    };
  }
}

export async function phoneRegister(request: PhoneRegisterRequest): Promise<RegisterResponse> {
  const baseValidation = validateUsername(request.username);
  if (!baseValidation.isValid) {
    return { success: false, error: baseValidation.error };
  }
  const phoneValidation = validatePhone(request.phone);
  if (!phoneValidation.isValid) {
    return { success: false, error: phoneValidation.error };
  }
  const nicknameValidation = validateNickname(request.nickname);
  if (!nicknameValidation.isValid) {
    return { success: false, error: nicknameValidation.error };
  }
  const passwordValidation = validatePasswordStrength(request.password);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors[0] };
  }

  if (IS_DEV) {
    return register({
      username: request.username,
      email: `${request.username}@example.com`,
      phone: request.phone,
      password: request.password,
      confirmPassword: request.password,
      nickname: request.nickname,
    });
  }

  const verifyResult = await verifyVerificationCode(undefined, request.phone, request.code, "register");
  if (!verifyResult.success) {
    return {
      success: false,
      error: verifyResult.error || "Phone register verification failed.",
    };
  }

  return register({
    username: request.username,
    email: "",
    phone: request.phone,
    password: request.password,
    confirmPassword: request.password,
    nickname: request.nickname,
  });
}

export async function emailRegister(request: EmailRegisterRequest): Promise<RegisterResponse> {
  const baseValidation = validateUsername(request.username);
  if (!baseValidation.isValid) {
    return { success: false, error: baseValidation.error };
  }
  const emailValidation = validateEmail(request.email);
  if (!emailValidation.isValid) {
    return { success: false, error: emailValidation.error };
  }
  const nicknameValidation = validateNickname(request.nickname);
  if (!nicknameValidation.isValid) {
    return { success: false, error: nicknameValidation.error };
  }
  const passwordValidation = validatePasswordStrength(request.password);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors[0] };
  }

  if (IS_DEV) {
    return register({
      username: request.username,
      email: request.email,
      phone: "13800138000",
      password: request.password,
      confirmPassword: request.password,
      nickname: request.nickname,
    });
  }

  const verifyResult = await verifyVerificationCode(request.email, undefined, request.code, "register");
  if (!verifyResult.success) {
    return {
      success: false,
      error: verifyResult.error || "Email register verification failed.",
    };
  }

  return register({
    username: request.username,
    email: request.email,
    phone: "",
    password: request.password,
    confirmPassword: request.password,
    nickname: request.nickname,
  });
}
