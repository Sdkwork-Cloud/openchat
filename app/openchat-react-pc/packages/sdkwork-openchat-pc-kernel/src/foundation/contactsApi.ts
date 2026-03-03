import { apiClient } from "./apiClient";

export interface Friend {
  id: string;
  username?: string;
  nickname?: string;
  name?: string;
  avatar?: string;
  status?: "online" | "offline" | "busy" | string;
  isOnline?: boolean;
  remark?: string;
  signature?: string;
  region?: string;
  initial?: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  toId: string;
  status: "pending" | "accepted" | "rejected";
  message?: string;
  createdAt: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt?: string;
}

export interface SearchContactsParams {
  keyword?: string;
  region?: string;
  isOnline?: boolean;
}

export interface AddFriendParams {
  userId: string;
  message?: string;
}

export interface ProcessFriendRequestParams {
  requestId: string;
  action: "accept" | "reject";
}

export interface FriendStats {
  total: number;
  online: number;
  newToday: number;
}

const contactsApi = {
  getFriends: () => apiClient.get<Friend[]>("/friends"),
  searchContacts: (params: SearchContactsParams) =>
    apiClient.get<Friend[]>("/friends/search", { params: { ...params } }),
  getFriendDetail: (friendId: string) => apiClient.get<Friend>(`/friends/${friendId}`),
  addFriend: (params: AddFriendParams) =>
    apiClient.post<{ success: boolean; error?: string }>("/friends/requests", params),
  deleteFriend: (friendId: string) =>
    apiClient.delete<{ success: boolean; error?: string }>(`/friends/${friendId}`),
  getFriendRequests: () => apiClient.get<FriendRequest[]>("/friends/requests"),
  processFriendRequest: (params: ProcessFriendRequestParams) =>
    apiClient.post<{ success: boolean; error?: string }>(
      `/friends/requests/${params.requestId}/${params.action}`,
    ),
  getContactGroups: () => apiClient.get<ContactGroup[]>("/contacts/groups"),
  createContactGroup: (name: string) =>
    apiClient.post<ContactGroup>("/contacts/groups", { name }),
  updateContactGroup: (groupId: string, updates: { name?: string; memberIds?: string[] }) =>
    apiClient.put<ContactGroup>(`/contacts/groups/${groupId}`, updates),
  deleteContactGroup: (groupId: string) =>
    apiClient.delete<{ success: boolean }>(`/contacts/groups/${groupId}`),
  updateFriendRemark: (friendId: string, remark: string) =>
    apiClient.put<{ success: boolean; error?: string }>(`/friends/${friendId}/remark`, { remark }),
  getFriendStats: () => apiClient.get<FriendStats>("/friends/stats"),
};

export default contactsApi;
