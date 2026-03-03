import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CallModal,
  type CallSession,
  type CallType,
  useRTC,
} from "@sdkwork/openchat-pc-rtc";
import { ChatHeader } from "../components/ChatHeader";
import { ChatInput, type MediaItem } from "../components/ChatInput";
import {
  ConversationList,
  type NewConversationPayload,
} from "../components/ConversationList";
import { MessageBubble } from "../components/MessageBubble";
import type { Conversation } from "../entities/conversation.entity";
import type { Message, MessageAttachment } from "../entities/message.entity";
import { useConversations } from "../hooks/useConversations";
import { useMessages } from "../hooks/useMessages";

const fallbackConversations: Conversation[] = [
  {
    id: "ai-1",
    name: "OpenChat Assistant",
    avatar: "AI",
    lastMessage: "Ready to help with product and engineering questions.",
    lastMessageTime: "09:18",
    unreadCount: 2,
    isOnline: true,
    type: "ai",
  },
  {
    id: "team-1",
    name: "Core Team",
    avatar: "CT",
    lastMessage: "Roadmap review moved to 16:00.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    isOnline: true,
    type: "group",
  },
  {
    id: "u-1",
    name: "Alex",
    avatar: "A",
    lastMessage: "Ping me when the build is ready.",
    lastMessageTime: "08:42",
    unreadCount: 0,
    isOnline: true,
    type: "single",
  },
];

const fallbackMessages: Record<string, Message[]> = {
  "ai-1": [
    {
      id: "m-1",
      conversationId: "ai-1",
      senderId: "assistant",
      senderName: "OpenChat Assistant",
      senderAvatar: "AI",
      content: { type: "text", text: "Hi, I am OpenChat Assistant. How can I help?" },
      type: "ai",
      time: "09:15",
      status: "read",
    },
    {
      id: "m-2",
      conversationId: "ai-1",
      senderId: "current-user",
      senderName: "You",
      senderAvatar: "Me",
      content: { type: "text", text: "Summarize today's delivery risks." },
      type: "user",
      time: "09:16",
      status: "read",
    },
    {
      id: "m-3",
      conversationId: "ai-1",
      senderId: "assistant",
      senderName: "OpenChat Assistant",
      senderAvatar: "AI",
      content: {
        type: "text",
        text: "Main risks are API coupling, unverified edge cases, and missing alert rules.",
      },
      type: "ai",
      time: "09:18",
      status: "read",
    },
  ],
  "team-1": [
    {
      id: "m-4",
      conversationId: "team-1",
      senderId: "u-9",
      senderName: "Mia",
      senderAvatar: "M",
      content: { type: "text", text: "Please review PR #184 before noon." },
      type: "ai",
      time: "Yesterday",
      status: "read",
    },
  ],
  "u-1": [
    {
      id: "m-5",
      conversationId: "u-1",
      senderId: "current-user",
      senderName: "You",
      senderAvatar: "Me",
      content: { type: "text", text: "Can we sync on release timeline?" },
      type: "user",
      time: "08:40",
      status: "read",
    },
    {
      id: "m-6",
      conversationId: "u-1",
      senderId: "u-1",
      senderName: "Alex",
      senderAvatar: "A",
      content: { type: "text", text: "Sure, let's discuss after standup." },
      type: "ai",
      time: "08:42",
      status: "read",
    },
  ],
};

function formatNow(): string {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toMessageAttachments(items: MediaItem[]): MessageAttachment[] {
  return items.map((item) => ({
    id: item.id,
    type: item.type === "video" ? "video" : item.type === "image" ? "image" : "file",
    url: item.url,
    name: item.name,
    size: item.size,
    thumbnailUrl: item.thumbnail,
    duration: item.duration,
  }));
}

function getLastMessagePreview(text: string, attachments: MediaItem[]): string {
  const normalizedText = text.trim();
  if (normalizedText) {
    return normalizedText;
  }

  if (attachments.length === 0) {
    return "";
  }

  if (attachments.length === 1) {
    const attachment = attachments[0];
    if (attachment.type === "image") return "[image]";
    if (attachment.type === "video") return "[video]";
    return `[file] ${attachment.name || "attachment"}`;
  }

  return `[attachments] ${attachments.length} items`;
}

function normalizeMessageForRender(message: Message): Message {
  const isCurrentUser =
    message.senderId === "current-user" ||
    message.type === "user" ||
    message.status === "sending" ||
    message.status === "failed";

  return {
    ...message,
    type: isCurrentUser ? "user" : message.type === "user" ? "user" : "ai",
    time: normalizeTime(message.time),
  };
}

function buildExternalConversation(
  conversationId: string,
  conversationName: string,
  conversationType: Conversation["type"],
): Conversation {
  const avatar =
    conversationType === "ai" ? "AI" : conversationName.slice(0, 1).toUpperCase() || "U";

  return {
    id: conversationId,
    name: conversationName,
    avatar,
    lastMessage: "",
    lastMessageTime: formatNow(),
    unreadCount: 0,
    isOnline: true,
    type: conversationType,
  };
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localConversations, setLocalConversations] = useState<Conversation[]>(
    fallbackConversations,
  );
  const [localMessagesByConversation, setLocalMessagesByConversation] =
    useState<Record<string, Message[]>>(fallbackMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const {
    session: rtcSession,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useRTC();

  const activeCallSession = useMemo<CallSession | null>(() => {
    if (!rtcSession) {
      return null;
    }
    if (rtcSession.status === "ended" || rtcSession.status === "failed") {
      return null;
    }
    return rtcSession;
  }, [rtcSession]);

  const {
    conversations: sdkConversations,
    refresh: refreshConversations,
  } = useConversations(selectedId);
  const sdkEnabled = sdkConversations.length > 0;

  const selectedConversationFromSDK = useMemo(
    () => (selectedId ? sdkConversations.some((item) => item.id === selectedId) : false),
    [sdkConversations, selectedId],
  );

  const {
    messages: sdkMessages,
    sendMessage: sendSdkMessage,
    isLoading: isLoadingMessages,
  } = useMessages(selectedConversationFromSDK ? selectedId : null);

  const externalConversations = useMemo(() => {
    if (!sdkEnabled) {
      return localConversations;
    }

    const fallbackSeedIds = new Set(fallbackConversations.map((item) => item.id));
    return localConversations.filter(
      (item) =>
        !fallbackSeedIds.has(item.id) || sdkConversations.some((remote) => remote.id === item.id),
    );
  }, [localConversations, sdkConversations, sdkEnabled]);

  const conversations = useMemo(() => {
    if (!sdkEnabled) {
      return externalConversations;
    }

    const merged = new Map<string, Conversation>();
    sdkConversations.forEach((item) => merged.set(item.id, item));
    externalConversations.forEach((item) => {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });
    return Array.from(merged.values());
  }, [externalConversations, sdkConversations, sdkEnabled]);

  const targetContactId = searchParams.get("contactId");
  const targetContactName = searchParams.get("contactName");
  const targetAgentId = searchParams.get("agentId");
  const targetAgentName = searchParams.get("agentName");

  const targetConversationId = targetContactId || targetAgentId;
  const targetConversationName =
    targetContactName ||
    targetAgentName ||
    (targetAgentId ? "AI Agent" : targetContactId ? "Contact" : "");
  const targetConversationType: Conversation["type"] = targetAgentId ? "ai" : "single";

  useEffect(() => {
    if (!targetConversationId) {
      return;
    }

    const matched = conversations.find(
      (item) => item.id === targetConversationId || item.name === targetConversationName,
    );

    if (matched) {
      setSelectedId(matched.id);
    } else {
      setLocalConversations((previous) => {
        if (previous.some((item) => item.id === targetConversationId)) {
          return previous;
        }

        return [
          buildExternalConversation(targetConversationId, targetConversationName, targetConversationType),
          ...previous,
        ];
      });

      setLocalMessagesByConversation((previous) => {
        if (previous[targetConversationId]) {
          return previous;
        }

        if (targetConversationType !== "ai") {
          return {
            ...previous,
            [targetConversationId]: [],
          };
        }

        return {
          ...previous,
          [targetConversationId]: [
            {
              id: `${targetConversationId}-welcome`,
              conversationId: targetConversationId,
              senderId: "assistant",
              senderName: targetConversationName,
              senderAvatar: "AI",
              content: {
                type: "text",
                text: `Hello, I am ${targetConversationName}. What do you want to build today?`,
              },
              type: "ai",
              time: formatNow(),
              status: "read",
            },
          ],
        };
      });

      setSelectedId(targetConversationId);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("contactId");
    nextParams.delete("contactName");
    nextParams.delete("agentId");
    nextParams.delete("agentName");
    setSearchParams(nextParams, { replace: true });
  }, [
    conversations,
    searchParams,
    setSearchParams,
    targetConversationId,
    targetConversationName,
    targetConversationType,
  ]);

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedId(null);
      return;
    }

    const currentStillExists = selectedId
      ? conversations.some((item) => item.id === selectedId)
      : false;

    if (!currentStillExists) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messages = useMemo(() => {
    if (!selectedId) {
      return [];
    }

    const source = selectedConversationFromSDK
      ? sdkMessages
      : localMessagesByConversation[selectedId] ?? [];
    return source.map(normalizeMessageForRender);
  }, [localMessagesByConversation, sdkMessages, selectedConversationFromSDK, selectedId]);

  useEffect(() => {
    const target = messageEndRef.current;
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedId, messages.length]);

  const handleSend = async (content: string, attachments?: MediaItem[]) => {
    if (!selectedId) {
      return;
    }

    const text = content.trim();
    const attachmentList = attachments || [];
    if (!text && attachmentList.length === 0) {
      return;
    }

    if (selectedConversationFromSDK) {
      try {
        if (text) {
          await sendSdkMessage({
            type: "text",
            text,
          });
        }

        for (const attachment of attachmentList) {
          if (attachment.type === "image") {
            await sendSdkMessage({
              type: "image",
              url: attachment.url,
              fileName: attachment.name,
              fileSize: attachment.size,
            });
            continue;
          }

          if (attachment.type === "video") {
            await sendSdkMessage({
              type: "video",
              url: attachment.url,
              fileName: attachment.name,
              fileSize: attachment.size,
              duration: attachment.duration,
            });
            continue;
          }

          await sendSdkMessage({
            type: "file",
            url: attachment.url,
            fileName: attachment.name,
            fileSize: attachment.size,
          });
        }
      } catch (error) {
        console.error("Failed to send sdk message", error);
      }
      return;
    }

    const now = formatNow();
    const myMessage: Message = {
      id: `${selectedId}-${Date.now()}`,
      conversationId: selectedId,
      senderId: "current-user",
      senderName: "You",
      senderAvatar: "Me",
      content: { type: "text", text },
      type: "user",
      time: now,
      status: "sent",
      attachments: toMessageAttachments(attachmentList),
    };

    setLocalMessagesByConversation((previous) => ({
      ...previous,
      [selectedId]: [...(previous[selectedId] ?? []), myMessage],
    }));

    setLocalConversations((previous) =>
      previous.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              lastMessage: getLastMessagePreview(text, attachmentList),
              lastMessageTime: now,
            }
          : item,
      ),
    );
  };

  const handleCall = async (callType: CallType) => {
    if (!selectedConversation) {
      return;
    }
    await initiateCall(
      selectedConversation.id,
      selectedConversation.name,
      selectedConversation.avatar,
      callType,
    );
  };

  const handleNewConversation = async (payload?: NewConversationPayload) => {
    if (payload) {
      setLocalConversations((previous) => {
        if (previous.some((item) => item.id === payload.id)) {
          return previous;
        }
        return [buildExternalConversation(payload.id, payload.name, payload.type), ...previous];
      });

      setLocalMessagesByConversation((previous) => {
        if (previous[payload.id]) {
          return previous;
        }
        return {
          ...previous,
          [payload.id]: [],
        };
      });

      setSelectedId(payload.id);
    }

    try {
      await refreshConversations();
    } catch (error) {
      console.warn("Failed to refresh conversations after create action", error);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNewConversation={(payload) => {
          void handleNewConversation(payload);
        }}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-bg-primary">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              onCall={(callType) => {
                void handleCall(callType);
              }}
            />

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingMessages && selectedConversationFromSDK ? (
                <div className="text-sm text-text-muted">Loading messages...</div>
              ) : null}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messageEndRef} />
            </div>

            <footer className="border-t border-border bg-bg-secondary">
              <ChatInput
                onSend={(messageText, messageAttachments) => {
                  void handleSend(messageText, messageAttachments);
                }}
                disabled={!selectedConversation}
              />
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-tertiary">
            Select a conversation to start chatting.
          </div>
        )}
      </section>

      <CallModal
        session={activeCallSession}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangup={hangup}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
      />
    </div>
  );
}

export default ChatPage;
