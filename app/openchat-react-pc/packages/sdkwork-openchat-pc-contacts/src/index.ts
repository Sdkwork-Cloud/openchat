export { ContactsPage } from "./pages/ContactsPage";
export { useContacts } from "./hooks/useContacts";

export * from "./services";

export type {
  ContactGroup,
  ContactSearchResult,
  ContactTab,
  Friend,
  FriendFilter,
  FriendRequest,
  Group,
} from "./entities/contact.entity";

export type {
  AddFriendParams,
  ContactGroupMemberState,
  ContactGroupNotice,
  ContactGroupRole,
  ContactGroupRuntimeState,
  ContactGroupRuntimeMap,
  FriendStats,
  ProcessFriendRequestParams,
  SearchContactsParams,
} from "./services";

export type { UseContactsReturn } from "./hooks/useContacts";
