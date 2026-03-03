import { apiClient, IS_DEV } from "@sdkwork/openchat-pc-kernel";
import type {
  FeedbackSubmission,
  FeedbackSubmitRequest,
  FeedbackSupportInfo,
} from "../types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const FEEDBACK_BASE_URL = "/app/v3/api/feedback";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function unwrapData<T>(response: unknown): T {
  const object = asObject(response);
  if (object && "data" in object) {
    return (object as ApiEnvelope<T>).data as T;
  }
  return response as T;
}

function normalizeFeedbackSubmission(
  value: unknown,
  request: FeedbackSubmitRequest,
): FeedbackSubmission {
  const payload = asObject(value);
  const now = new Date().toISOString();

  return {
    id: readString(payload?.id) || `fb_${Date.now()}`,
    type: readString(payload?.type) || request.type,
    content: readString(payload?.content) || request.content,
    status: readString(payload?.status) || "submitted",
    submitTime: readString(payload?.submitTime) || now,
    processTime: readString(payload?.processTime),
  };
}

function normalizeSupportInfo(value: unknown): FeedbackSupportInfo {
  const payload = asObject(value);
  return {
    hotline: readString(payload?.hotline),
    email: readString(payload?.email),
    workingHours: readString(payload?.workingHours),
    wechatQrcode: readString(payload?.wechatQrcode),
    onlineSupportUrl: readString(payload?.onlineSupportUrl),
    faqUrl: readString(payload?.faqUrl),
    helpCenterUrl: readString(payload?.helpCenterUrl),
  };
}

function normalizeSubmitRequest(request: FeedbackSubmitRequest): FeedbackSubmitRequest {
  return {
    type: request.type.trim(),
    content: request.content.trim(),
    contact: request.contact?.trim(),
    attachmentUrl: request.attachmentUrl?.trim(),
    screenshotUrl: request.screenshotUrl?.trim(),
  };
}

function validateSubmitRequest(request: FeedbackSubmitRequest): void {
  if (!request.type) {
    throw new Error("Feedback type is required.");
  }
  if (!request.content) {
    throw new Error("Feedback content is required.");
  }
}

async function withFallback<T>(
  apiTask: () => Promise<T>,
  fallbackTask: () => T,
): Promise<T> {
  try {
    return await apiTask();
  } catch (error) {
    if (!IS_DEV) {
      throw error;
    }
    return fallbackTask();
  }
}

class FeedbackServiceClass {
  async submitFeedback(request: FeedbackSubmitRequest): Promise<FeedbackSubmission> {
    const payload = normalizeSubmitRequest(request);
    validateSubmitRequest(payload);

    return withFallback(
      async () => {
        const response = await apiClient.post<unknown>(FEEDBACK_BASE_URL, payload);
        return normalizeFeedbackSubmission(unwrapData<unknown>(response), payload);
      },
      () => normalizeFeedbackSubmission(undefined, payload),
    );
  }

  async getFeedbackSupportInfo(): Promise<FeedbackSupportInfo> {
    return withFallback(
      async () => {
        const response = await apiClient.get<unknown>(`${FEEDBACK_BASE_URL}/support`);
        return normalizeSupportInfo(unwrapData<unknown>(response));
      },
      () => ({
        email: "support@example.com",
        workingHours: "Mon-Fri 09:00-18:00",
      }),
    );
  }
}

export const FeedbackService = new FeedbackServiceClass();
