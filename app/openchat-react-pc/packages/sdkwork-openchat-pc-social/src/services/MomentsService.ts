import { apiClient, IS_DEV, type Page, type Result } from "@sdkwork/openchat-pc-kernel";
import type { Comment, Moment, MomentFilter, PublishMomentData, SocialStats } from "../types";

const MOMENTS_ENDPOINT = "/social/moments";
const now = Date.now();

const seedMoments: Moment[] = [
  {
    id: "moment-1",
    author: "Omni Vision",
    authorId: "user-1",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Omni",
    content:
      "Built a reusable agent workflow pipeline today. The biggest win was reducing context switches between model and tool execution.",
    images: ["https://picsum.photos/720/420?random=401"],
    comments: [
      {
        id: "comment-1",
        userId: "user-2",
        userName: "Mia",
        text: "Great summary. Can you share the routing strategy details?",
        createTime: now - 2 * 60 * 60 * 1000,
      },
    ],
    likes: 36,
    hasLiked: false,
    likedBy: ["user-2", "user-3"],
    location: "Shanghai",
    isPublic: true,
    createTime: now - 4 * 60 * 60 * 1000,
    updateTime: now - 4 * 60 * 60 * 1000,
  },
  {
    id: "moment-2",
    author: "Current User",
    authorId: "current_user",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
    content:
      "Finished the package split and switched module pages to API-first service calls. The app shell now stays much cleaner.",
    images: [],
    comments: [],
    likes: 12,
    hasLiked: true,
    likedBy: ["user-1"],
    isPublic: true,
    createTime: now - 10 * 60 * 60 * 1000,
    updateTime: now - 10 * 60 * 60 * 1000,
  },
];

type PartialPage<T> = Partial<Page<T>> & { list?: T[]; pageSize?: number };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) {
    return "just now";
  }

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "just now";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} min ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} h ago`;
  }
  return `${Math.floor(diff / day)} d ago`;
}

function toResult<T>(response: unknown, defaultData: T): Result<T> {
  if (response && typeof response === "object" && "success" in response) {
    const result = response as Partial<Result<T>>;
    return {
      success: Boolean(result.success),
      data: (result.data as T | undefined) ?? defaultData,
      message: typeof result.message === "string" ? result.message : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
      code: typeof result.code === "number" ? result.code : undefined,
    };
  }

  if (response && typeof response === "object" && "data" in response) {
    return { success: true, data: ((response as { data: T }).data ?? defaultData) as T };
  }

  if (response === undefined || response === null) {
    return { success: true, data: defaultData };
  }

  return { success: true, data: response as T };
}

function normalizeComment(input: Partial<Comment>): Comment {
  return {
    id: input.id || createId("comment"),
    userId: input.userId || "unknown",
    userName: input.userName || "Unknown",
    userAvatar: input.userAvatar,
    text: input.text || "",
    createTime: toNumber(input.createTime, Date.now()),
    replyTo: input.replyTo,
  };
}

function normalizeMoment(input: Partial<Moment>): Moment {
  const comments = Array.isArray(input.comments)
    ? input.comments.map((comment) => normalizeComment(comment as Partial<Comment>))
    : [];
  const createTime = toNumber(input.createTime, Date.now());

  return {
    id: input.id || createId("moment"),
    author: input.author || "Unknown",
    authorId: input.authorId || "unknown",
    avatar: input.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown",
    content: input.content || "",
    images: Array.isArray(input.images) ? input.images.filter((item): item is string => typeof item === "string") : [],
    comments,
    likes: Math.max(0, toNumber(input.likes)),
    hasLiked: Boolean(input.hasLiked),
    likedBy: Array.isArray(input.likedBy) ? input.likedBy.filter((item): item is string => typeof item === "string") : [],
    location: input.location,
    displayTime: input.displayTime || formatRelativeTime(createTime),
    isPublic: input.isPublic === undefined ? true : Boolean(input.isPublic),
    createTime,
    updateTime: toNumber(input.updateTime, createTime),
  };
}

function normalizePage(input: unknown, page: number, size: number): Page<Moment> {
  const payload = input as PartialPage<unknown>;
  const source = Array.isArray(payload.content) ? payload.content : Array.isArray(payload.list) ? payload.list : [];
  const content = source.map((item) => normalizeMoment(item as Partial<Moment>));
  const total = toNumber(payload.total, content.length);
  const currentPage = toNumber(payload.page, page);
  const currentSize = toNumber(payload.size ?? payload.pageSize, size);

  return {
    content,
    total,
    page: currentPage,
    size: currentSize,
    totalPages: toNumber(payload.totalPages, Math.max(1, Math.ceil(total / Math.max(1, currentSize)))),
  };
}

function normalizeStats(input: Partial<SocialStats>): SocialStats {
  return {
    totalMoments: toNumber(input.totalMoments),
    totalLikes: toNumber(input.totalLikes),
    totalComments: toNumber(input.totalComments),
    followers: toNumber(input.followers),
    following: toNumber(input.following),
  };
}

class MomentsServiceImpl {
  private fallbackMoments: Moment[] = seedMoments.map((item) => ({ ...item }));
  private currentUserId = "current_user";
  private currentUserName = "Current User";
  private currentUserAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser";

  private async withFallback<T>(
    apiTask: () => Promise<Result<T>>,
    fallbackTask: () => Result<T> | Promise<Result<T>>,
  ): Promise<Result<T>> {
    try {
      return await apiTask();
    } catch (error) {
      if (IS_DEV) {
        return fallbackTask();
      }
      throw error;
    }
  }

  private queryFallbackFeed(filter: MomentFilter): Moment[] {
    return this.fallbackMoments
      .filter((item) => (filter.authorId ? item.authorId === filter.authorId : true))
      .filter((item) => (filter.isPublic !== undefined ? item.isPublic === filter.isPublic : true))
      .filter((item) => (filter.startTime !== undefined ? (item.createTime || 0) >= filter.startTime : true))
      .filter((item) => (filter.endTime !== undefined ? (item.createTime || 0) <= filter.endTime : true))
      .sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
      .map((item) => ({ ...item, displayTime: formatRelativeTime(item.createTime) }));
  }

  async getFeed(
    filter: MomentFilter = {},
    page: number = 1,
    size: number = 10,
  ): Promise<Result<Page<Moment>>> {
    return this.withFallback(
      async () => {
        const fallbackData = normalizePage({ content: [], total: 0, page, size }, page, size);
        const response = await apiClient.get<unknown>(MOMENTS_ENDPOINT, {
          params: {
            authorId: filter.authorId,
            isPublic: filter.isPublic,
            startTime: filter.startTime,
            endTime: filter.endTime,
            page,
            size,
          },
        });
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }
        return { ...result, data: normalizePage(result.data, page, size) };
      },
      () => {
        const filtered = this.queryFallbackFeed(filter);
        const start = (page - 1) * size;
        const content = filtered.slice(start, start + size).map((item) => ({ ...item }));
        return {
          success: true,
          data: {
            content,
            total: filtered.length,
            page,
            size,
            totalPages: Math.max(1, Math.ceil(filtered.length / size)),
          },
        };
      },
    );
  }

  async publish(data: PublishMomentData): Promise<Result<Moment>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(MOMENTS_ENDPOINT, data);
        const result = toResult<unknown>(response, undefined);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }

        const moment = normalizeMoment(
          ((result.data as Partial<Moment> | undefined) ?? {
            author: this.currentUserName,
            authorId: this.currentUserId,
            avatar: this.currentUserAvatar,
            content: data.content,
            images: data.images,
            comments: [],
            likes: 0,
            hasLiked: false,
            likedBy: [],
            location: data.location,
            isPublic: data.isPublic,
          }) as Partial<Moment>,
        );

        return { success: true, data: moment, message: result.message };
      },
      () => {
        const moment = normalizeMoment({
          id: createId("moment"),
          author: this.currentUserName,
          authorId: this.currentUserId,
          avatar: this.currentUserAvatar,
          content: data.content,
          images: data.images,
          comments: [],
          likes: 0,
          hasLiked: false,
          likedBy: [],
          location: data.location,
          isPublic: data.isPublic,
          createTime: Date.now(),
          updateTime: Date.now(),
        });

        this.fallbackMoments = [moment, ...this.fallbackMoments];
        return { success: true, data: moment };
      },
    );
  }

  async likeMoment(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${MOMENTS_ENDPOINT}/${id}/like`);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        this.fallbackMoments = this.fallbackMoments.map((item) => {
          if (item.id !== id) {
            return item;
          }

          const hasLiked = !item.hasLiked;
          const likes = hasLiked ? item.likes + 1 : Math.max(0, item.likes - 1);
          const likedBy = hasLiked
            ? Array.from(new Set([...item.likedBy, this.currentUserId]))
            : item.likedBy.filter((userId) => userId !== this.currentUserId);

          return {
            ...item,
            hasLiked,
            likes,
            likedBy,
            updateTime: Date.now(),
          };
        });

        return { success: true };
      },
    );
  }

  async addComment(
    momentId: string,
    text: string,
    replyTo?: { userId: string; userName: string },
  ): Promise<Result<Comment>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.post<unknown>(`${MOMENTS_ENDPOINT}/${momentId}/comments`, {
          text,
          replyTo,
        });
        const result = toResult<unknown>(response, undefined);
        if (!result.success) {
          return { success: false, message: result.message || result.error };
        }

        const comment = normalizeComment(
          ((result.data as Partial<Comment> | undefined) ?? {
            userId: this.currentUserId,
            userName: this.currentUserName,
            userAvatar: this.currentUserAvatar,
            text,
            replyTo,
            createTime: Date.now(),
          }) as Partial<Comment>,
        );

        return { success: true, data: comment, message: result.message };
      },
      () => {
        const index = this.fallbackMoments.findIndex((item) => item.id === momentId);
        if (index < 0) {
          return { success: false, message: "Moment not found." };
        }

        const comment = normalizeComment({
          id: createId("comment"),
          userId: this.currentUserId,
          userName: this.currentUserName,
          userAvatar: this.currentUserAvatar,
          text,
          replyTo,
          createTime: Date.now(),
        });

        this.fallbackMoments[index] = {
          ...this.fallbackMoments[index],
          comments: [...this.fallbackMoments[index].comments, comment],
          updateTime: Date.now(),
        };

        return { success: true, data: comment };
      },
    );
  }

  async deleteComment(momentId: string, commentId: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${MOMENTS_ENDPOINT}/${momentId}/comments/${commentId}`);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        const index = this.fallbackMoments.findIndex((item) => item.id === momentId);
        if (index < 0) {
          return { success: false, message: "Moment not found." };
        }

        this.fallbackMoments[index] = {
          ...this.fallbackMoments[index],
          comments: this.fallbackMoments[index].comments.filter((comment) => comment.id !== commentId),
          updateTime: Date.now(),
        };

        return { success: true };
      },
    );
  }

  async deleteMoment(id: string): Promise<Result<void>> {
    return this.withFallback(
      async () => {
        const response = await apiClient.delete<unknown>(`${MOMENTS_ENDPOINT}/${id}`);
        const result = toResult<unknown>(response, undefined);
        return result.success
          ? { success: true, message: result.message }
          : { success: false, message: result.message || result.error };
      },
      () => {
        const previousLength = this.fallbackMoments.length;
        this.fallbackMoments = this.fallbackMoments.filter((item) => item.id !== id);
        return this.fallbackMoments.length < previousLength
          ? { success: true }
          : { success: false, message: "Moment not found." };
      },
    );
  }

  async getStats(userId?: string): Promise<Result<SocialStats>> {
    return this.withFallback(
      async () => {
        const fallbackData: SocialStats = {
          totalMoments: 0,
          totalLikes: 0,
          totalComments: 0,
          followers: 0,
          following: 0,
        };
        const response = await apiClient.get<unknown>(`${MOMENTS_ENDPOINT}/stats`, {
          params: { userId },
        });
        const result = toResult<unknown>(response, fallbackData);
        if (!result.success) {
          return { ...result, data: fallbackData };
        }
        return {
          ...result,
          data: normalizeStats((result.data || fallbackData) as Partial<SocialStats>),
        };
      },
      () => {
        const list = userId
          ? this.fallbackMoments.filter((item) => item.authorId === userId)
          : this.fallbackMoments;

        return {
          success: true,
          data: {
            totalMoments: list.length,
            totalLikes: list.reduce((sum, item) => sum + item.likes, 0),
            totalComments: list.reduce((sum, item) => sum + item.comments.length, 0),
            followers: 128,
            following: 56,
          },
        };
      },
    );
  }
}

export const MomentsService = new MomentsServiceImpl();
