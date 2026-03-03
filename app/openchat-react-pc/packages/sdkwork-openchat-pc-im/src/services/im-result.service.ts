import { createServiceResultProxy } from "@sdkwork/openchat-pc-contracts";
import * as conversationService from "./conversation.service";
import * as fileService from "./file.service";
import * as groupService from "./group.service";
import * as messageService from "./message.service";

export const ConversationResultService = createServiceResultProxy(conversationService, {
  source: "sdk",
  fallbackMessage: "Conversation service request failed.",
});

export const MessageResultService = createServiceResultProxy(messageService, {
  source: "sdk",
  fallbackMessage: "Message service request failed.",
});

export const GroupResultService = createServiceResultProxy(groupService, {
  source: "sdk",
  fallbackMessage: "Group service request failed.",
});

export const FileResultService = createServiceResultProxy(fileService, {
  source: "local",
  fallbackMessage: "IM file service request failed.",
});
