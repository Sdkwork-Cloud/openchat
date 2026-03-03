import { useMemo, useState } from "react";
import type { Friend } from "@sdkwork/openchat-pc-contacts";
import { IS_DEV } from "@sdkwork/openchat-pc-kernel";
import { Modal, ModalButtonGroup } from "@sdkwork/openchat-pc-ui";
import { GroupResultService } from "../services";

type CreateGroupResponseLike = {
  success?: boolean;
  group?: { id: string; name: string };
  error?: string;
};

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdGroup: { id: string; name: string }) => void;
  friends: Friend[];
  isFriendsLoading?: boolean;
  friendLoadError?: string | null;
}

function getFriendDisplayName(friend: Friend): string {
  return friend.remark || friend.nickname || friend.name || friend.username || friend.id;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
  friends,
  isFriendsLoading = false,
  friendLoadError = null,
}: CreateGroupModalProps) {
  const [keyword, setKeyword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredFriends = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) {
      return friends;
    }

    return friends.filter((friend) => {
      const displayName = getFriendDisplayName(friend).toLowerCase();
      return friend.id.toLowerCase().includes(text) || displayName.includes(text);
    });
  }, [friends, keyword]);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedIds.has(friend.id)),
    [friends, selectedIds],
  );

  const canSubmit = groupName.trim().length > 0 && selectedIds.size >= 2;

  const toggleMember = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClose = () => {
    setKeyword("");
    setGroupName("");
    setSelectedIds(new Set());
    setIsCreating(false);
    setSubmitError(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      return;
    }

    setIsCreating(true);
    setSubmitError(null);
    try {
      const responseResult = await GroupResultService.createGroup({
        name: groupName.trim(),
        memberIds: Array.from(selectedIds),
      });
      if (!responseResult.success) {
        setSubmitError(responseResult.error || "Failed to create group.");
        return;
      }

      const response = (responseResult.data || {}) as CreateGroupResponseLike;

      if (!response.success || !response.group) {
        if (IS_DEV) {
          onSuccess({
            id: `local-group-${Date.now()}`,
            name: groupName.trim(),
          });
          handleClose();
          return;
        }
        setSubmitError(response.error || "Failed to create group.");
        return;
      }

      onSuccess({
        id: response.group.id,
        name: response.group.name,
      });
      handleClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create group.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Group Chat"
      size="xl"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Selected members: {selectedIds.size}</span>
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleCreate}
            confirmText="Create Group"
            confirmVariant="success"
            isLoading={isCreating}
            disabled={!canSubmit}
          />
        </div>
      }
    >
      <div className="flex h-[560px] min-h-0">
        <div className="flex w-1/2 min-w-0 flex-col border-r border-border bg-bg-secondary">
          <div className="space-y-3 border-b border-border p-4">
            <div className="space-y-2">
              <label className="text-xs text-text-muted">Group name</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Example: Product Review Team"
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-muted">Find members</label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search by id or name"
                className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {isFriendsLoading ? (
              <div className="rounded-lg border border-border p-6 text-center text-sm text-text-muted">
                Loading contacts...
              </div>
            ) : null}

            {!isFriendsLoading && friendLoadError ? (
              <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
                {friendLoadError}
              </div>
            ) : null}

            {!isFriendsLoading &&
            !friendLoadError &&
            filteredFriends.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                No contacts available for group creation.
              </div>
            ) : null}

            {!isFriendsLoading &&
              !friendLoadError &&
              filteredFriends.map((friend) => {
                const selected = selectedIds.has(friend.id);
                return (
                  <label
                    key={friend.id}
                    className="flex cursor-pointer items-center rounded-lg border border-border bg-bg-primary p-2.5 transition-colors hover:border-primary/40 hover:bg-bg-hover"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMember(friend.id)}
                      className="mr-3 h-4 w-4 rounded"
                    />
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                      {friend.avatar || getFriendDisplayName(friend).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="truncate text-sm text-text-primary">
                        {getFriendDisplayName(friend)}
                      </div>
                      <div className="truncate text-xs text-text-muted">{friend.id}</div>
                    </div>
                  </label>
                );
              })}
          </div>
        </div>

        <div className="flex w-1/2 min-w-0 flex-col bg-bg-tertiary/30">
          <div className="border-b border-border p-4 text-sm font-medium text-text-secondary">
            Selected list
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {selectedFriends.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-muted">
                Select at least two contacts.
              </div>
            ) : (
              selectedFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center rounded-lg border border-border bg-bg-primary p-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                    {friend.avatar || getFriendDisplayName(friend).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="ml-2.5 min-w-0 flex-1 text-sm text-text-primary">
                    {getFriendDisplayName(friend)}
                  </div>
                  <button
                    onClick={() => toggleMember(friend.id)}
                    className="rounded px-2 py-1 text-xs text-text-tertiary hover:bg-bg-hover hover:text-error"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {submitError ? (
        <div className="border-t border-border bg-error/10 px-5 py-3 text-sm text-error">
          {submitError}
        </div>
      ) : null}
    </Modal>
  );
}

export default CreateGroupModal;
