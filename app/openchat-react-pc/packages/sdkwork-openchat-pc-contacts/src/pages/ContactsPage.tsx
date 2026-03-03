import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContactDetail } from "../components/ContactDetail";
import { ContactSidebar } from "../components/ContactSidebar";
import type {
  ContactTab,
  Friend,
  FriendFilter,
  FriendRequest,
  Group,
} from "../entities/contact.entity";
import {
  createContactGroup,
  getContactGroups,
  getFriends,
  getFriendRequests,
  processFriendRequest,
} from "../services";

const fallbackFriends: Friend[] = [
  {
    id: "f-1",
    name: "Alex",
    avatar: "A",
    isOnline: true,
    status: "online",
    initial: "A",
    region: "Beijing",
    signature: "Stay focused and keep shipping.",
    remark: "Product manager",
  },
  {
    id: "f-2",
    name: "Bella",
    avatar: "B",
    isOnline: false,
    status: "offline",
    initial: "B",
    region: "Shanghai",
    signature: "Design is communication.",
    remark: "UI designer",
  },
  {
    id: "f-3",
    name: "Chen",
    avatar: "C",
    isOnline: true,
    status: "busy",
    initial: "C",
    region: "Shenzhen",
    signature: "Reliability first.",
    remark: "Backend engineer",
  },
  {
    id: "f-4",
    name: "Dora",
    avatar: "D",
    isOnline: true,
    status: "online",
    initial: "D",
    region: "Hangzhou",
    signature: "Quality through automation.",
    remark: "QA engineer",
  },
];

const fallbackGroups: Group[] = [
  {
    id: "g-1",
    name: "OpenChat Product",
    avatar: "P",
    memberCount: 3,
    memberIds: ["f-1", "f-2", "f-3"],
    description: "Product planning and review.",
  },
  {
    id: "g-2",
    name: "Frontend Team",
    avatar: "F",
    memberCount: 2,
    memberIds: ["f-2", "f-4"],
    description: "Client architecture and UX optimization.",
  },
  {
    id: "g-3",
    name: "Delivery Squad",
    avatar: "D",
    memberCount: 4,
    memberIds: ["f-1", "f-2", "f-3", "f-4"],
    description: "Release tracking and issue follow-up.",
  },
];

const fallbackRequests: FriendRequest[] = [
  {
    id: "req-1",
    fromId: "f-10",
    fromName: "Mia",
    fromAvatar: "M",
    toId: "current-user",
    status: "pending",
    message: "Hi, let's connect for product sync.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "req-2",
    fromId: "f-11",
    fromName: "Noah",
    fromAvatar: "N",
    toId: "current-user",
    status: "pending",
    message: "We are in the same project group.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

function normalizeFriend(friend: Friend): Friend {
  const displayName = friend.remark || friend.nickname || friend.name || friend.username || "Contact";
  return {
    ...friend,
    name: displayName,
    avatar: friend.avatar || displayName.slice(0, 1).toUpperCase(),
    initial: (friend.initial || displayName.slice(0, 1) || "#").toUpperCase(),
    status: friend.status || (friend.isOnline ? "online" : "offline"),
    isOnline: Boolean(friend.isOnline),
  };
}

function mapContactGroupToGroup(item: {
  id: string;
  name: string;
  memberIds?: string[];
  description?: string;
  createdAt?: string;
}): Group {
  const title = item.name || "Untitled Group";
  const memberIds = Array.isArray(item.memberIds) ? item.memberIds : [];
  return {
    id: item.id,
    name: title,
    avatar: title.slice(0, 1).toUpperCase(),
    memberCount: memberIds.length,
    memberIds,
    description: item.description,
    createdAt: item.createdAt,
  };
}

export function ContactsPage() {
  const navigate = useNavigate();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  const [activeTab, setActiveTab] = useState<ContactTab>("friends");
  const [filter, setFilter] = useState<FriendFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      try {
        const [apiFriends, apiGroups, apiRequests] = await Promise.all([
          getFriends(),
          getContactGroups(),
          getFriendRequests(),
        ]);

        if (cancelled) {
          return;
        }

        const normalizedFriends =
          apiFriends.length > 0 ? apiFriends.map(normalizeFriend) : fallbackFriends;

        const normalizedGroups =
          apiGroups.length > 0
            ? apiGroups.map((group) =>
                mapContactGroupToGroup(group as {
                  id: string;
                  name: string;
                  memberIds?: string[];
                  description?: string;
                  createdAt?: string;
                }),
              )
            : fallbackGroups;

        setFriends(normalizedFriends);
        setGroups(normalizedGroups);
        setFriendRequests(apiRequests.length > 0 ? apiRequests : fallbackRequests);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load contacts, using fallback data.", error);
          setFriends(fallbackFriends);
          setGroups(fallbackGroups);
          setFriendRequests(fallbackRequests);
        }
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFriends = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return friends.filter((friend) => {
      if (filter === "online" && !friend.isOnline) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const target = `${friend.name || ""} ${friend.remark || ""} ${friend.signature || ""}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [filter, friends, searchKeyword]);

  const groupedFriends = useMemo(() => {
    return visibleFriends.reduce<Record<string, Friend[]>>((acc, friend) => {
      const key = (friend.initial || "#").toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(friend);
      return acc;
    }, {});
  }, [visibleFriends]);

  const sortedInitials = useMemo(() => Object.keys(groupedFriends).sort(), [groupedFriends]);

  const selectedFriend = useMemo(
    () =>
      activeTab === "friends" && filter !== "new"
        ? friends.find((item) => item.id === selectedId)
        : undefined,
    [activeTab, filter, friends, selectedId],
  );

  const selectedGroup = useMemo(
    () => (activeTab === "groups" ? groups.find((item) => item.id === selectedId) : undefined),
    [activeTab, groups, selectedId],
  );

  const friendMap = useMemo(() => {
    return new Map<string, Friend>(friends.map((item) => [item.id, item]));
  }, [friends]);

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup?.memberIds || selectedGroup.memberIds.length === 0) {
      return [];
    }
    return selectedGroup.memberIds
      .map((memberId) => friendMap.get(memberId))
      .filter((item): item is Friend => Boolean(item));
  }, [friendMap, selectedGroup]);

  useEffect(() => {
    if (activeTab === "friends" && filter === "new") {
      return;
    }

    if (activeTab === "friends") {
      if (!selectedId || !friends.some((item) => item.id === selectedId)) {
        setSelectedId(friends[0]?.id ?? null);
      }
      return;
    }

    if (!selectedId || !groups.some((item) => item.id === selectedId)) {
      setSelectedId(groups[0]?.id ?? null);
    }
  }, [activeTab, filter, friends, groups, selectedId]);

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await processFriendRequest({
        requestId,
        action: "accept",
      });

      if (!result.success) {
        return;
      }

      const request = friendRequests.find((item) => item.id === requestId);

      setFriendRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? { ...item, status: "accepted", handledAt: new Date().toISOString() }
            : item,
        ),
      );

      if (request && !friends.some((item) => item.id === request.fromId)) {
        const newFriend = normalizeFriend({
          id: request.fromId,
          name: request.fromName,
          avatar: request.fromAvatar || request.fromName.slice(0, 1).toUpperCase(),
          isOnline: false,
          status: "offline",
          initial: request.fromName.slice(0, 1).toUpperCase(),
        });
        setFriends((prev) => [newFriend, ...prev]);
      }
    } catch (error) {
      console.error("Failed to accept friend request.", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await processFriendRequest({
        requestId,
        action: "reject",
      });

      if (!result.success) {
        return;
      }

      setFriendRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? { ...item, status: "rejected", handledAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to reject friend request.", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleStartChat = (friend: Friend) => {
    const contactName = friend.remark || friend.name || friend.nickname || "Contact";
    const params = new URLSearchParams({
      contactId: friend.id,
      contactName,
    });
    navigate(`/chat?${params.toString()}`);
  };

  const handleCreateGroup = async () => {
    const rawName = window.prompt("Group name");
    if (rawName === null) {
      return;
    }

    const groupName = rawName.trim();
    if (!groupName) {
      return;
    }

    try {
      const created = await createContactGroup(groupName);
      const nextGroup: Group = {
        id: created.id,
        name: created.name,
        avatar: created.name.slice(0, 1).toUpperCase(),
        memberCount: created.memberIds.length,
        memberIds: created.memberIds,
      };
      setGroups((prev) => [nextGroup, ...prev.filter((item) => item.id !== nextGroup.id)]);
      setActiveTab("groups");
      setFilter("all");
      setSelectedId(nextGroup.id);
    } catch (error) {
      console.error("Failed to create group.", error);
    }
  };

  const handleGroupUpdated = (nextGroup: Group) => {
    setGroups((prev) => prev.map((item) => (item.id === nextGroup.id ? nextGroup : item)));
  };

  const handleGroupDeleted = (groupId: string) => {
    setGroups((prev) => prev.filter((item) => item.id !== groupId));
    setSelectedId((prev) => (prev === groupId ? null : prev));
  };

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-bg-primary">
      <ContactSidebar
        friends={visibleFriends}
        groups={groups}
        friendRequests={friendRequests}
        activeTab={activeTab}
        filter={filter}
        groupedFriends={groupedFriends}
        sortedInitials={sortedInitials}
        selectedId={selectedId}
        searchKeyword={searchKeyword}
        processingRequestId={processingRequestId}
        onSearchChange={setSearchKeyword}
        onTabChange={setActiveTab}
        onFilterChange={setFilter}
        onSelect={setSelectedId}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onCreateGroup={handleCreateGroup}
      />

      <ContactDetail
        friend={selectedFriend}
        group={selectedGroup}
        groupMembers={selectedGroupMembers}
        onStartChat={handleStartChat}
        onGroupUpdated={handleGroupUpdated}
        onGroupDeleted={handleGroupDeleted}
      />
    </div>
  );
}

export default ContactsPage;
