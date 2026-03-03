import { useEffect, useMemo, useState } from "react";
import {
  addFriend,
  searchContacts,
  type Friend,
} from "@sdkwork/openchat-pc-contacts";
import { Button, Modal, ModalButtonGroup } from "@sdkwork/openchat-pc-ui";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_MESSAGE = "Hi, let's connect on OpenChat.";

function getDisplayName(user: Friend): string {
  return user.remark || user.nickname || user.name || user.username || user.id;
}

export function AddFriendModal({ isOpen, onClose, onSuccess }: AddFriendModalProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedUser, setSelectedUser] = useState<Friend | null>(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasSearchKeyword = useMemo(() => keyword.trim().length > 0, [keyword]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const text = keyword.trim();
    if (!text) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchContacts({ keyword: text });
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : "Failed to search contacts.");
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, keyword]);

  const handleClose = () => {
    setKeyword("");
    setSelectedUser(null);
    setMessage(DEFAULT_MESSAGE);
    setSearchResults([]);
    setIsSearching(false);
    setIsSending(false);
    setSearchError(null);
    setSubmitError(null);
    onClose();
  };

  const handleSend = async () => {
    if (!selectedUser) {
      return;
    }

    setIsSending(true);
    setSubmitError(null);
    try {
      const result = await addFriend({
        userId: selectedUser.id,
        message: message.trim() || undefined,
      });

      if (!result.success) {
        setSubmitError(result.error || "Failed to send friend request.");
        return;
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to send friend request.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Contact"
      size="md"
      footer={
        selectedUser ? (
          <ModalButtonGroup
            onCancel={handleClose}
            onConfirm={handleSend}
            confirmText="Send Request"
            isLoading={isSending}
            disabled={!message.trim()}
          />
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <label className="text-xs text-text-muted">Search by user id, nickname, or name</label>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Type a keyword"
            className="h-10 w-full rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary outline-none focus:border-primary"
          />
        </div>

        {!selectedUser ? (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {isSearching ? (
              <div className="rounded-lg border border-border p-6 text-center text-sm text-text-muted">
                Searching...
              </div>
            ) : null}

            {!isSearching && searchError ? (
              <div className="rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
                {searchError}
              </div>
            ) : null}

            {!isSearching && !searchError && !hasSearchKeyword ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                Enter a keyword to find contacts.
              </div>
            ) : null}

            {!isSearching && !searchError && hasSearchKeyword && searchResults.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-muted">
                No matching contacts found.
              </div>
            ) : null}

            {!isSearching &&
              !searchError &&
              searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="flex w-full items-center rounded-lg border border-border bg-bg-secondary p-3 text-left transition-colors hover:border-primary/50 hover:bg-bg-hover"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                    {user.avatar || getDisplayName(user).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">
                      {getDisplayName(user)}
                    </div>
                    <div className="truncate text-xs text-text-muted">
                      {user.id}
                      {user.region ? ` - ${user.region}` : ""}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center rounded-lg border border-border bg-bg-secondary p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                {selectedUser.avatar || getDisplayName(selectedUser).slice(0, 1).toUpperCase()}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">
                  {getDisplayName(selectedUser)}
                </div>
                <div className="truncate text-xs text-text-muted">{selectedUser.id}</div>
              </div>
              <Button variant="ghost" size="small" onClick={() => setSelectedUser(null)}>
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-text-muted">Request message</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={100}
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary outline-none focus:border-primary"
              />
              <div className="text-right text-xs text-text-muted">{message.length}/100</div>
            </div>

            {submitError ? (
              <div className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
                {submitError}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AddFriendModal;
