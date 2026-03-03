import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { Friend, Group } from "../entities/contact.entity";
import {
  deleteContactGroupNotice,
  getContactGroupRuntimeState,
  leaveContactGroup,
  muteContactGroupMember,
  publishContactGroupNotice,
  setContactGroupMemberRole,
  transferContactGroupOwnership,
  type ContactGroupNotice,
  type ContactGroupRole,
  type ContactGroupRuntimeState,
} from "../services";

interface GroupDetailProps {
  group: Group;
  members?: Friend[];
  onGroupUpdated?: (group: Group) => void;
  onGroupDeleted?: (groupId: string) => void;
}

interface GroupMemberView {
  id: string;
  name: string;
  avatar: string;
  role: ContactGroupRole;
  muteEndTime?: string;
}

function toDisplayName(friend: Friend): string {
  return friend.remark || friend.nickname || friend.name || friend.username || friend.id;
}

function formatMuteStatus(muteEndTime?: string): string {
  if (!muteEndTime) {
    return "Not muted";
  }
  const date = new Date(muteEndTime);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    return "Not muted";
  }
  return `Muted until ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function sortNotices(input: ContactGroupNotice[]): ContactGroupNotice[] {
  return [...input].sort((left, right) => {
    if (left.isPinned && !right.isPinned) return -1;
    if (!left.isPinned && right.isPinned) return 1;
    return new Date(right.publishTime).getTime() - new Date(left.publishTime).getTime();
  });
}

export const GroupDetail = memo(
  ({ group, members = [], onGroupUpdated, onGroupDeleted }: GroupDetailProps) => {
    const [runtime, setRuntime] = useState<ContactGroupRuntimeState | null>(null);
    const [newNotice, setNewNotice] = useState("");
    const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
    const [isPublishingNotice, setIsPublishingNotice] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [isLeaving, setIsLeaving] = useState(false);

    const friendMap = useMemo(() => {
      return new Map<string, Friend>(members.map((member) => [member.id, member]));
    }, [members]);

    const memberIds = useMemo(() => {
      const fromGroup = Array.isArray(group.memberIds) ? group.memberIds : [];
      if (fromGroup.length > 0) {
        return fromGroup;
      }
      if (members.length > 0) {
        return members.map((member) => member.id);
      }
      return Array.from({ length: Math.max(1, Math.min(group.memberCount || 1, 12)) }, (_, index) => {
        return `${group.id}-member-${index + 1}`;
      });
    }, [group.id, group.memberCount, group.memberIds, members]);

    const loadRuntime = useCallback(async () => {
      try {
        const next = await getContactGroupRuntimeState(group.id);
        setRuntime(next);
      } catch (error) {
        console.error("Failed to load group runtime state.", error);
      }
    }, [group.id]);

    useEffect(() => {
      void loadRuntime();
    }, [loadRuntime]);

    const ownerId = runtime?.ownerId || memberIds[0] || "";

    const memberViews = useMemo<GroupMemberView[]>(() => {
      const stateById = new Map<string, { role: ContactGroupRole; muteEndTime?: string }>();
      (runtime?.memberStates || []).forEach((item) => {
        stateById.set(item.memberId, {
          role: item.role,
          muteEndTime: item.muteEndTime,
        });
      });

      return memberIds.map((memberId, index) => {
        const friend = friendMap.get(memberId);
        const baseName = friend ? toDisplayName(friend) : `Member ${index + 1}`;
        const role = stateById.get(memberId)?.role || (memberId === ownerId || index === 0 ? "owner" : "member");
        return {
          id: memberId,
          name: baseName,
          avatar: (friend?.avatar || baseName.slice(0, 1) || "M").toUpperCase(),
          role,
          muteEndTime: stateById.get(memberId)?.muteEndTime,
        };
      });
    }, [friendMap, memberIds, ownerId, runtime?.memberStates]);

    const notices = useMemo(() => sortNotices(runtime?.notices || []), [runtime?.notices]);

    const applyMemberAction = useCallback(
      async (memberId: string, task: () => Promise<{ success: boolean; error?: string }>, successText: string) => {
        setBusyMemberId(memberId);
        setFeedback("");
        try {
          const result = await task();
          if (!result.success) {
            setFeedback(result.error || "Operation failed.");
            return;
          }
          await loadRuntime();
          setFeedback(successText);
        } finally {
          setBusyMemberId(null);
        }
      },
      [loadRuntime],
    );

    const handlePublishNotice = async () => {
      const content = newNotice.trim();
      if (!content) {
        setFeedback("Notice content cannot be empty.");
        return;
      }

      setIsPublishingNotice(true);
      setFeedback("");
      try {
        const result = await publishContactGroupNotice(group.id, content, true);
        if (!result.success) {
          setFeedback(result.error || "Failed to publish notice.");
          return;
        }
        setNewNotice("");
        await loadRuntime();
        setFeedback("Notice published.");
      } finally {
        setIsPublishingNotice(false);
      }
    };

    const handleDeleteNotice = async (noticeId: string) => {
      setFeedback("");
      const result = await deleteContactGroupNotice(group.id, noticeId);
      if (!result.success) {
        setFeedback(result.error || "Failed to delete notice.");
        return;
      }
      await loadRuntime();
      setFeedback("Notice deleted.");
    };

    const handleLeaveGroup = async () => {
      setIsLeaving(true);
      setFeedback("");
      try {
        const currentUserId = localStorage.getItem("uid") || ownerId || memberIds[0] || "current-user";
        const result = await leaveContactGroup(group.id, currentUserId);
        if (!result.success) {
          setFeedback(result.error || "Failed to leave group.");
          return;
        }

        if (result.removedGroup) {
          onGroupDeleted?.(group.id);
          return;
        }

        const nextMemberIds = memberIds.filter((item) => item !== currentUserId);
        const nextGroup: Group = {
          ...group,
          memberIds: nextMemberIds,
          memberCount: nextMemberIds.length,
        };
        onGroupUpdated?.(nextGroup);
        setFeedback("Left group successfully.");
      } finally {
        setIsLeaving(false);
      }
    };

    return (
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
        <div className="flex h-[60px] items-center border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6">
          <h2 className="text-base font-medium text-[var(--text-primary)]">{group.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
              <div className="flex items-start gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ai-purple)] to-[var(--ai-primary-dark)] text-2xl font-semibold text-white shadow-[var(--shadow-glow)]">
                  {group.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-2xl font-semibold text-[var(--text-primary)]">{group.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{memberIds.length} members</p>
                  {group.description ? (
                    <p className="mt-2 text-sm text-[var(--text-tertiary)]">{group.description}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">Group Notices</h4>
              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={newNotice}
                  onChange={(event) => setNewNotice(event.target.value)}
                  rows={2}
                  placeholder="Publish a notice to all members..."
                  className="flex-1 resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--ai-primary)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handlePublishNotice();
                  }}
                  disabled={isPublishingNotice}
                  className="h-10 rounded-lg bg-[var(--ai-primary)] px-4 text-sm text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {isPublishingNotice ? "Publishing..." : "Publish"}
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {notices.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No notices yet.</p>
                ) : (
                  notices.map((notice) => (
                    <div
                      key={notice.id}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-[var(--text-primary)]">{notice.content}</p>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteNotice(notice.id);
                          }}
                          className="rounded px-2 py-1 text-xs text-[var(--ai-error)] hover:bg-[rgba(239,68,68,0.1)]"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {notice.publisherName} · {new Date(notice.publishTime).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
              <h4 className="text-sm font-medium text-[var(--text-tertiary)]">Members</h4>
              <div className="mt-4 space-y-3">
                {memberViews.map((member) => {
                  const isBusy = busyMemberId === member.id;
                  const isOwner = member.role === "owner";
                  const isAdmin = member.role === "admin";
                  const isMuted = Boolean(member.muteEndTime && new Date(member.muteEndTime).getTime() > Date.now());

                  return (
                    <div
                      key={member.id}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ai-primary)] to-[var(--ai-primary-hover)] text-sm font-semibold text-white">
                          {member.avatar}
                        </div>
                        <div className="min-w-[160px] flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{member.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Role: {member.role} · {formatMuteStatus(member.muteEndTime)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!isOwner ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                void applyMemberAction(
                                  member.id,
                                  () => setContactGroupMemberRole(group.id, member.id, isAdmin ? "member" : "admin"),
                                  isAdmin ? "Role updated to member." : "Role updated to admin.",
                                );
                              }}
                              className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                            >
                              {isAdmin ? "Set Member" : "Set Admin"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              void applyMemberAction(
                                member.id,
                                () => muteContactGroupMember(group.id, member.id, isMuted ? 0 : 30),
                                isMuted ? "Mute cleared." : "Muted for 30 minutes.",
                              );
                            }}
                            className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                          >
                            {isMuted ? "Unmute" : "Mute 30m"}
                          </button>
                          {!isOwner ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                void applyMemberAction(
                                  member.id,
                                  () => transferContactGroupOwnership(group.id, member.id),
                                  "Ownership transferred.",
                                );
                              }}
                              className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
                            >
                              Make Owner
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              onClick={() => {
                void handleLeaveGroup();
              }}
              disabled={isLeaving}
              className="w-full rounded-xl bg-[rgba(239,68,68,0.1)] py-3 text-sm font-medium text-[var(--ai-error)] transition-colors hover:bg-[rgba(239,68,68,0.15)] disabled:opacity-60"
            >
              {isLeaving ? "Leaving..." : "Leave Group"}
            </button>

            {feedback ? <p className="text-sm text-[var(--text-secondary)]">{feedback}</p> : null}
          </div>
        </div>
      </div>
    );
  },
);

GroupDetail.displayName = "GroupDetail";
