import {
  IS_DEV,
  contactsApi,
  type AddFriendParams,
  type ContactGroup,
  type Friend,
  type FriendRequest,
  type FriendStats,
  type ProcessFriendRequestParams,
  type SearchContactsParams,
} from "@sdkwork/openchat-pc-kernel";

export type {
  Friend,
  FriendRequest,
  ContactGroup,
  SearchContactsParams,
  AddFriendParams,
  ProcessFriendRequestParams,
  FriendStats,
};

const FRIENDS_STORAGE_KEY = "openchat.contacts.friends";
const REQUESTS_STORAGE_KEY = "openchat.contacts.requests";
const GROUPS_STORAGE_KEY = "openchat.contacts.groups";
const GROUP_RUNTIME_STORAGE_KEY = "openchat.contacts.group-runtime";

export type ContactGroupRole = "owner" | "admin" | "member";

export interface ContactGroupNotice {
  id: string;
  groupId: string;
  content: string;
  publisherId: string;
  publisherName: string;
  publishTime: string;
  isPinned: boolean;
}

export interface ContactGroupMemberState {
  memberId: string;
  role: ContactGroupRole;
  muteEndTime?: string;
}

export interface ContactGroupRuntimeState {
  groupId: string;
  ownerId: string;
  notices: ContactGroupNotice[];
  memberStates: ContactGroupMemberState[];
}

export type ContactGroupRuntimeMap = Record<string, ContactGroupRuntimeState>;

const seedFriends: Friend[] = [
  {
    id: "friend-alex",
    name: "Alex",
    nickname: "Alex",
    avatar: "A",
    status: "online",
    isOnline: true,
    remark: "Product manager",
    signature: "Stay focused, ship often.",
    region: "Beijing",
    initial: "A",
  },
  {
    id: "friend-bella",
    name: "Bella",
    nickname: "Bella",
    avatar: "B",
    status: "offline",
    isOnline: false,
    remark: "UI designer",
    signature: "Design is communication.",
    region: "Shanghai",
    initial: "B",
  },
  {
    id: "friend-chen",
    name: "Chen",
    nickname: "Chen",
    avatar: "C",
    status: "busy",
    isOnline: true,
    remark: "Backend engineer",
    signature: "Reliability first.",
    region: "Shenzhen",
    initial: "C",
  },
];

const seedRequests: FriendRequest[] = [
  {
    id: "request-mia",
    fromId: "mia",
    fromName: "Mia",
    fromAvatar: "M",
    toId: "current-user",
    status: "pending",
    message: "Let's connect for product sync.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "request-noah",
    fromId: "noah",
    fromName: "Noah",
    fromAvatar: "N",
    toId: "current-user",
    status: "pending",
    message: "We are in the same project group.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const seedGroups: ContactGroup[] = [
  {
    id: "group-product",
    name: "Product Team",
    memberIds: ["friend-alex", "friend-bella", "friend-chen"],
  },
  {
    id: "group-engineering",
    name: "Engineering",
    memberIds: ["friend-chen"],
  },
];

let fallbackFriends: Friend[] = readArrayFromStorage<Friend>(FRIENDS_STORAGE_KEY, seedFriends);
let fallbackRequests: FriendRequest[] = readArrayFromStorage<FriendRequest>(REQUESTS_STORAGE_KEY, seedRequests);
let fallbackGroups: ContactGroup[] = readArrayFromStorage<ContactGroup>(GROUPS_STORAGE_KEY, seedGroups);
let fallbackGroupRuntime: ContactGroupRuntimeMap = readRecordFromStorage<ContactGroupRuntimeMap>(
  GROUP_RUNTIME_STORAGE_KEY,
  {},
);

function readArrayFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof localStorage === "undefined") {
    return fallback.map((item) => ({ ...item }));
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback.map((item) => ({ ...item }));
  } catch {
    return fallback.map((item) => ({ ...item }));
  }
}

function readRecordFromStorage<T extends object>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") {
    return { ...fallback };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { ...fallback };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return parsed as T;
  } catch {
    return { ...fallback };
  }
}

function persistFallback(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(fallbackFriends));
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(fallbackRequests));
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(fallbackGroups));
  localStorage.setItem(GROUP_RUNTIME_STORAGE_KEY, JSON.stringify(fallbackGroupRuntime));
}

function extractData<T>(payload: unknown, fallback: T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as { data?: T };
    return wrapped.data ?? fallback;
  }
  if (payload === undefined || payload === null) {
    return fallback;
  }
  return payload as T;
}

function ensureArray<T>(input: unknown): T[] {
  return Array.isArray(input) ? input : [];
}

function normalizeFriend(input: Partial<Friend>): Friend {
  const display = input.remark || input.nickname || input.name || input.username || "Contact";
  return {
    id: input.id || `friend-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username: input.username,
    nickname: input.nickname || input.name,
    name: input.name || input.nickname || display,
    avatar: input.avatar || display.slice(0, 1).toUpperCase(),
    status: input.status || (input.isOnline ? "online" : "offline"),
    isOnline: Boolean(input.isOnline),
    remark: input.remark,
    signature: input.signature,
    region: input.region,
    initial: (input.initial || display.slice(0, 1) || "#").toUpperCase(),
  };
}

function normalizeRequest(input: Partial<FriendRequest>): FriendRequest {
  return {
    id: input.id || `request-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    fromId: input.fromId || "",
    fromName: input.fromName || "Unknown",
    fromAvatar: input.fromAvatar || input.fromName?.slice(0, 1)?.toUpperCase() || "U",
    toId: input.toId || "current-user",
    status:
      input.status === "accepted" || input.status === "rejected" || input.status === "pending"
        ? input.status
        : "pending",
    message: input.message,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeGroup(input: Partial<ContactGroup>): ContactGroup {
  return {
    id: input.id || `group-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: input.name || "Untitled Group",
    memberIds: Array.isArray(input.memberIds)
      ? input.memberIds.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function getCurrentUserId(): string {
  if (typeof localStorage === "undefined") {
    return "current-user";
  }
  return localStorage.getItem("uid") || "current-user";
}

function getDisplayNameForUser(userId: string): string {
  const friend = fallbackFriends.find((item) => item.id === userId);
  if (!friend) {
    return userId;
  }
  return friend.remark || friend.nickname || friend.name || friend.username || userId;
}

function ensureGroupRuntime(groupId: string): ContactGroupRuntimeState {
  const current = fallbackGroupRuntime[groupId];
  const group = fallbackGroups.find((item) => item.id === groupId);
  const memberIds = group?.memberIds || [];
  const ownerId = current?.ownerId || group?.memberIds?.[0] || getCurrentUserId();

  const existingMemberMap = new Map<string, ContactGroupMemberState>();
  (current?.memberStates || []).forEach((item) => {
    existingMemberMap.set(item.memberId, item);
  });

  const mergedMemberStates: ContactGroupMemberState[] = memberIds.map((memberId, index) => {
    const existing = existingMemberMap.get(memberId);
    if (existing) {
      return existing;
    }
    if (memberId === ownerId || index === 0) {
      return { memberId, role: "owner" };
    }
    return { memberId, role: "member" };
  });

  const runtime: ContactGroupRuntimeState = {
    groupId,
    ownerId,
    notices: (current?.notices || []).slice().sort((left, right) => {
      if (left.isPinned && !right.isPinned) return -1;
      if (!left.isPinned && right.isPinned) return 1;
      return new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime();
    }),
    memberStates: mergedMemberStates,
  };

  fallbackGroupRuntime[groupId] = runtime;
  return runtime;
}

function upsertGroupRuntime(runtime: ContactGroupRuntimeState): void {
  fallbackGroupRuntime[runtime.groupId] = runtime;
}

function removeGroupRuntime(groupId: string): void {
  if (fallbackGroupRuntime[groupId]) {
    delete fallbackGroupRuntime[groupId];
  }
}

async function invokeContactsApiMethod<T>(
  methodName: string,
  args: unknown[],
  fallbackTask: () => T | Promise<T>,
  parseResponse?: (payload: unknown) => T,
): Promise<T> {
  const runtimeApi = contactsApi as unknown as Record<string, (...params: unknown[]) => Promise<unknown>>;
  const method = runtimeApi[methodName];
  if (typeof method !== "function") {
    return fallbackTask();
  }

  try {
    const response = await method(...args);
    if (parseResponse) {
      return parseResponse(response);
    }
    return response as T;
  } catch (error) {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  }
}

async function withFallback<T>(apiTask: () => Promise<T>, fallbackTask: () => T | Promise<T>): Promise<T> {
  try {
    return await apiTask();
  } catch (error) {
    if (IS_DEV) {
      return fallbackTask();
    }
    throw error;
  }
}

export async function searchContacts(params: SearchContactsParams): Promise<Friend[]> {
  return withFallback(
    async () => {
      const response = await contactsApi.searchContacts(params);
      const list = ensureArray<Partial<Friend>>(extractData<unknown[]>(response, []))
        .map((item) => normalizeFriend(item));
      return list;
    },
    () => {
      const keyword = params.keyword?.trim().toLowerCase() || "";
      return fallbackFriends
        .filter((item) => (params.isOnline !== undefined ? item.isOnline === params.isOnline : true))
        .filter((item) => (params.region ? item.region === params.region : true))
        .filter((item) => {
          if (!keyword) {
            return true;
          }
          const source = `${item.name || ""} ${item.nickname || ""} ${item.remark || ""} ${item.signature || ""}`.toLowerCase();
          return source.includes(keyword);
        })
        .map((item) => ({ ...item }));
    },
  );
}

export async function getFriends(): Promise<Friend[]> {
  return withFallback(
    async () => {
      const response = await contactsApi.getFriends();
      const list = ensureArray<Partial<Friend>>(extractData<unknown[]>(response, []))
        .map((item) => normalizeFriend(item));
      return list;
    },
    () => fallbackFriends.map((item) => ({ ...item })),
  );
}

export async function getFriendDetail(friendId: string): Promise<Friend | null> {
  return withFallback(
    async () => {
      const response = await contactsApi.getFriendDetail(friendId);
      if (!response) {
        return null;
      }
      const data = extractData<unknown>(response, response);
      if (!data) {
        return null;
      }
      return normalizeFriend(data as Partial<Friend>);
    },
    () => {
      const found = fallbackFriends.find((item) => item.id === friendId);
      return found ? { ...found } : null;
    },
  );
}

export async function addFriend(params: AddFriendParams): Promise<{ success: boolean; error?: string }> {
  return withFallback(
    async () => {
      const response = await contactsApi.addFriend(params);
      const payload = extractData<{ success?: boolean; error?: string }>(response, response);
      return payload.success === false
        ? { success: false, error: payload.error || "Failed to send request." }
        : { success: true };
    },
    () => {
      if (!params.userId) {
        return { success: false, error: "User id is required." };
      }

      if (fallbackFriends.some((item) => item.id === params.userId)) {
        return { success: false, error: "Already in your contacts." };
      }

      fallbackRequests = [
        normalizeRequest({
          fromId: params.userId,
          fromName: params.userId,
          fromAvatar: params.userId.slice(0, 1).toUpperCase(),
          toId: "current-user",
          status: "pending",
          message: params.message || "Add me as a friend.",
        }),
        ...fallbackRequests,
      ];
      persistFallback();
      return { success: true };
    },
  );
}

export async function deleteFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  return withFallback(
    async () => {
      const response = await contactsApi.deleteFriend(friendId);
      const payload = extractData<{ success?: boolean; error?: string }>(response, response);
      return payload.success === false
        ? { success: false, error: payload.error || "Failed to delete friend." }
        : { success: true };
    },
    () => {
      const before = fallbackFriends.length;
      fallbackFriends = fallbackFriends.filter((item) => item.id !== friendId);
      persistFallback();
      return fallbackFriends.length < before
        ? { success: true }
        : { success: false, error: "Friend not found." };
    },
  );
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  return withFallback(
    async () => {
      const response = await contactsApi.getFriendRequests();
      const list = ensureArray<Partial<FriendRequest>>(extractData<unknown[]>(response, []))
        .map((item) => normalizeRequest(item))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    },
    () =>
      fallbackRequests
        .map((item) => ({ ...item }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );
}

export async function processFriendRequest(
  params: ProcessFriendRequestParams,
): Promise<{ success: boolean; error?: string }> {
  return withFallback(
    async () => {
      const response = await contactsApi.processFriendRequest(params);
      const payload = extractData<{ success?: boolean; error?: string }>(response, response);
      return payload.success === false
        ? { success: false, error: payload.error || "Failed to process request." }
        : { success: true };
    },
    () => {
      const request = fallbackRequests.find((item) => item.id === params.requestId);
      if (!request) {
        return { success: false, error: "Request not found." };
      }

      fallbackRequests = fallbackRequests.map((item) =>
        item.id === params.requestId
          ? {
              ...item,
              status: params.action === "accept" ? "accepted" : "rejected",
            }
          : item,
      );

      if (params.action === "accept" && !fallbackFriends.some((item) => item.id === request.fromId)) {
        fallbackFriends = [
          normalizeFriend({
            id: request.fromId,
            name: request.fromName,
            nickname: request.fromName,
            avatar: request.fromAvatar || request.fromName.slice(0, 1).toUpperCase(),
            status: "offline",
            isOnline: false,
          }),
          ...fallbackFriends,
        ];
      }

      persistFallback();
      return { success: true };
    },
  );
}

export async function getContactGroups(): Promise<ContactGroup[]> {
  return withFallback(
    async () => {
      const response = await contactsApi.getContactGroups();
      const list = ensureArray<Partial<ContactGroup>>(extractData<unknown[]>(response, []))
        .map((item) => normalizeGroup(item));
      return list;
    },
    () => fallbackGroups.map((item) => ({ ...item })),
  );
}

export async function createContactGroup(name: string): Promise<ContactGroup> {
  return withFallback(
    async () => {
      const response = await contactsApi.createContactGroup(name);
      const group = normalizeGroup(extractData<Partial<ContactGroup>>(response, response));
      ensureGroupRuntime(group.id);
      persistFallback();
      return group;
    },
    () => {
      const currentUserId = getCurrentUserId();
      const group = normalizeGroup({
        id: `group-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: name || "Untitled Group",
        memberIds: [currentUserId],
      });
      fallbackGroups = [...fallbackGroups, group];
      ensureGroupRuntime(group.id);
      persistFallback();
      return group;
    },
  );
}

export async function updateContactGroup(
  groupId: string,
  updates: { name?: string; memberIds?: string[] },
): Promise<ContactGroup> {
  return withFallback(
    async () => {
      const response = await contactsApi.updateContactGroup(groupId, updates);
      const group = normalizeGroup(extractData<Partial<ContactGroup>>(response, response));
      ensureGroupRuntime(group.id);
      persistFallback();
      return group;
    },
    () => {
      const current = fallbackGroups.find((item) => item.id === groupId) || normalizeGroup({ id: groupId });
      const next = normalizeGroup({
        ...current,
        ...updates,
      });
      fallbackGroups = fallbackGroups.map((item) => (item.id === groupId ? next : item));
      ensureGroupRuntime(next.id);
      persistFallback();
      return next;
    },
  );
}

export async function deleteContactGroup(groupId: string): Promise<{ success: boolean }> {
  return withFallback(
    async () => {
      const response = await contactsApi.deleteContactGroup(groupId);
      const payload = extractData<{ success?: boolean }>(response, response);
      return { success: payload.success !== false };
    },
    () => {
      const before = fallbackGroups.length;
      fallbackGroups = fallbackGroups.filter((item) => item.id !== groupId);
      removeGroupRuntime(groupId);
      persistFallback();
      return { success: fallbackGroups.length < before };
    },
  );
}

export async function getContactGroupRuntimeState(groupId: string): Promise<ContactGroupRuntimeState> {
  return invokeContactsApiMethod<ContactGroupRuntimeState>(
    "getContactGroupRuntimeState",
    [groupId],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      persistFallback();
      return {
        ...runtime,
        notices: runtime.notices.map((item) => ({ ...item })),
        memberStates: runtime.memberStates.map((item) => ({ ...item })),
      };
    },
    (payload) => {
      const data = extractData<Partial<ContactGroupRuntimeState>>(payload, payload as Partial<ContactGroupRuntimeState>);
      const runtime = ensureGroupRuntime(groupId);
      const merged: ContactGroupRuntimeState = {
        groupId,
        ownerId: data.ownerId || runtime.ownerId,
        notices: Array.isArray(data.notices)
          ? data.notices.map((item) => ({
              id: item.id || `notice-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              groupId,
              content: item.content || "",
              publisherId: item.publisherId || "current-user",
              publisherName: item.publisherName || "Current User",
              publishTime: item.publishTime || new Date().toISOString(),
              isPinned: Boolean(item.isPinned),
            }))
          : runtime.notices,
        memberStates: Array.isArray(data.memberStates)
          ? data.memberStates.map((item) => ({
              memberId: item.memberId || "",
              role:
                item.role === "owner" || item.role === "admin" || item.role === "member"
                  ? item.role
                  : "member",
              muteEndTime: item.muteEndTime,
            }))
          : runtime.memberStates,
      };
      upsertGroupRuntime(merged);
      persistFallback();
      return merged;
    },
  );
}

export async function setContactGroupMemberRole(
  groupId: string,
  memberId: string,
  role: ContactGroupRole,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, error: "Member id is required." };
  }

  return invokeContactsApiMethod<{ success: boolean; error?: string }>(
    "setContactGroupMemberRole",
    [groupId, memberId, role],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      const existing = runtime.memberStates.find((item) => item.memberId === memberId);
      if (existing) {
        existing.role = role;
      } else {
        runtime.memberStates.push({ memberId, role });
      }
      if (role === "owner") {
        runtime.ownerId = memberId;
      }
      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
      return data.success === false ? { success: false, error: data.error || "Failed to update member role." } : { success: true };
    },
  );
}

export async function muteContactGroupMember(
  groupId: string,
  memberId: string,
  durationMinutes: number,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, error: "Member id is required." };
  }
  if (durationMinutes < 0) {
    return { success: false, error: "Duration must be non-negative." };
  }

  return invokeContactsApiMethod<{ success: boolean; error?: string }>(
    "muteContactGroupMember",
    [groupId, memberId, durationMinutes],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      const existing = runtime.memberStates.find((item) => item.memberId === memberId);
      const muteEndTime =
        durationMinutes === 0 ? undefined : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      if (existing) {
        existing.muteEndTime = muteEndTime;
      } else {
        runtime.memberStates.push({ memberId, role: "member", muteEndTime });
      }
      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
      return data.success === false ? { success: false, error: data.error || "Failed to mute member." } : { success: true };
    },
  );
}

export async function publishContactGroupNotice(
  groupId: string,
  content: string,
  isPinned: boolean = false,
): Promise<{ success: boolean; notice?: ContactGroupNotice; error?: string }> {
  const normalized = content.trim();
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!normalized) {
    return { success: false, error: "Notice content is required." };
  }

  return invokeContactsApiMethod<{ success: boolean; notice?: ContactGroupNotice; error?: string }>(
    "publishContactGroupNotice",
    [groupId, normalized, isPinned],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      const publisherId = getCurrentUserId();
      const notice: ContactGroupNotice = {
        id: `notice-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        groupId,
        content: normalized,
        publisherId,
        publisherName: getDisplayNameForUser(publisherId),
        publishTime: new Date().toISOString(),
        isPinned,
      };
      runtime.notices = [notice, ...runtime.notices].sort((left, right) => {
        if (left.isPinned && !right.isPinned) return -1;
        if (!left.isPinned && right.isPinned) return 1;
        return new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime();
      });
      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true, notice };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; notice?: ContactGroupNotice; error?: string }>(
        payload,
        payload as { success?: boolean; notice?: ContactGroupNotice; error?: string },
      );
      if (data.success === false) {
        return { success: false, error: data.error || "Failed to publish notice." };
      }
      return { success: true, notice: data.notice };
    },
  );
}

export async function deleteContactGroupNotice(
  groupId: string,
  noticeId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!noticeId.trim()) {
    return { success: false, error: "Notice id is required." };
  }

  return invokeContactsApiMethod<{ success: boolean; error?: string }>(
    "deleteContactGroupNotice",
    [groupId, noticeId],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      runtime.notices = runtime.notices.filter((item) => item.id !== noticeId);
      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
      return data.success === false ? { success: false, error: data.error || "Failed to delete notice." } : { success: true };
    },
  );
}

export async function transferContactGroupOwnership(
  groupId: string,
  newOwnerId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, error: "Group id is required." };
  }
  if (!newOwnerId.trim()) {
    return { success: false, error: "New owner id is required." };
  }

  return invokeContactsApiMethod<{ success: boolean; error?: string }>(
    "transferContactGroupOwnership",
    [groupId, newOwnerId],
    () => {
      const runtime = ensureGroupRuntime(groupId);
      const previousOwnerId = runtime.ownerId;
      runtime.ownerId = newOwnerId;

      runtime.memberStates = runtime.memberStates.map((item) => {
        if (item.memberId === newOwnerId) {
          return { ...item, role: "owner" };
        }
        if (item.memberId === previousOwnerId && item.role === "owner") {
          return { ...item, role: "admin" };
        }
        return item;
      });

      if (!runtime.memberStates.some((item) => item.memberId === newOwnerId)) {
        runtime.memberStates.push({ memberId: newOwnerId, role: "owner" });
      }

      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; error?: string }>(payload, payload as { success?: boolean; error?: string });
      return data.success === false
        ? { success: false, error: data.error || "Failed to transfer ownership." }
        : { success: true };
    },
  );
}

export async function leaveContactGroup(
  groupId: string,
  memberId: string = getCurrentUserId(),
): Promise<{ success: boolean; removedGroup: boolean; error?: string }> {
  if (!groupId.trim()) {
    return { success: false, removedGroup: false, error: "Group id is required." };
  }
  if (!memberId.trim()) {
    return { success: false, removedGroup: false, error: "Member id is required." };
  }

  return invokeContactsApiMethod<{ success: boolean; removedGroup: boolean; error?: string }>(
    "leaveContactGroup",
    [groupId, memberId],
    () => {
      const group = fallbackGroups.find((item) => item.id === groupId);
      if (!group) {
        return { success: false, removedGroup: false, error: "Group not found." };
      }

      const nextMemberIds = (group.memberIds || []).filter((id) => id !== memberId);
      if (nextMemberIds.length === 0) {
        fallbackGroups = fallbackGroups.filter((item) => item.id !== groupId);
        removeGroupRuntime(groupId);
        persistFallback();
        return { success: true, removedGroup: true };
      }

      fallbackGroups = fallbackGroups.map((item) =>
        item.id === groupId
          ? {
              ...item,
              memberIds: nextMemberIds,
            }
          : item,
      );

      const runtime = ensureGroupRuntime(groupId);
      runtime.memberStates = runtime.memberStates.filter((item) => item.memberId !== memberId);
      if (runtime.ownerId === memberId) {
        runtime.ownerId = nextMemberIds[0];
        runtime.memberStates = runtime.memberStates.map((item) =>
          item.memberId === runtime.ownerId ? { ...item, role: "owner" } : item,
        );
      }
      upsertGroupRuntime(runtime);
      persistFallback();
      return { success: true, removedGroup: false };
    },
    (payload) => {
      const data = extractData<{ success?: boolean; removedGroup?: boolean; error?: string }>(
        payload,
        payload as { success?: boolean; removedGroup?: boolean; error?: string },
      );
      if (data.success === false) {
        return { success: false, removedGroup: false, error: data.error || "Failed to leave group." };
      }
      return { success: true, removedGroup: Boolean(data.removedGroup) };
    },
  );
}

export async function updateFriendRemark(
  friendId: string,
  remark: string,
): Promise<{ success: boolean; error?: string }> {
  return withFallback(
    async () => {
      const response = await contactsApi.updateFriendRemark(friendId, remark);
      const payload = extractData<{ success?: boolean; error?: string }>(response, response);
      return payload.success === false
        ? { success: false, error: payload.error || "Failed to update remark." }
        : { success: true };
    },
    () => {
      const found = fallbackFriends.find((item) => item.id === friendId);
      if (!found) {
        return { success: false, error: "Friend not found." };
      }
      fallbackFriends = fallbackFriends.map((item) => (item.id === friendId ? { ...item, remark } : item));
      persistFallback();
      return { success: true };
    },
  );
}

export async function getFriendStats(): Promise<FriendStats> {
  return withFallback(
    async () => {
      const response = await contactsApi.getFriendStats();
      const data = extractData<Partial<FriendStats>>(response, response);
      return {
        total: Number.isFinite(Number(data.total)) ? Number(data.total) : 0,
        online: Number.isFinite(Number(data.online)) ? Number(data.online) : 0,
        newToday: Number.isFinite(Number(data.newToday)) ? Number(data.newToday) : 0,
      };
    },
    () => ({
      total: fallbackFriends.length,
      online: fallbackFriends.filter((item) => item.isOnline).length,
      newToday: fallbackRequests.filter((item) => {
        const created = new Date(item.createdAt);
        return created.toDateString() === new Date().toDateString();
      }).length,
    }),
  );
}

export default {
  searchContacts,
  getFriends,
  getFriendDetail,
  addFriend,
  deleteFriend,
  getFriendRequests,
  processFriendRequest,
  getContactGroups,
  createContactGroup,
  updateContactGroup,
  deleteContactGroup,
  getContactGroupRuntimeState,
  setContactGroupMemberRole,
  muteContactGroupMember,
  publishContactGroupNotice,
  deleteContactGroupNotice,
  transferContactGroupOwnership,
  leaveContactGroup,
  updateFriendRemark,
  getFriendStats,
};
