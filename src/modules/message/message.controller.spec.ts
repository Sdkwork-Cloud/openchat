import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessageStatus } from "./message.interface";

describe("MessageController", () => {
  function createController() {
    const messageService = {
      sendMessage: jest.fn(),
      sendMessageBatch: jest.fn(),
      ackConversationSeq: jest.fn(),
      ackConversationSeqBatch: jest.fn(),
      editMessage: jest.fn(),
      getMessageById: jest.fn(),
    };
    const messageReactionService = {
      setReaction: jest.fn(),
      getReactionSummary: jest.fn(),
    };

    const controller = new MessageController(
      messageService as any,
      messageReactionService as any,
    );
    return { controller, messageService, messageReactionService };
  }

  it("should derive stable clientSeq from Idempotency-Key header when clientSeq is missing", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    const req = {
      auth: { userId: "user-1" },
      headers: { "idempotency-key": "msg-send-0001" },
    } as any;

    await controller.sendMessage(
      {
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: { text: { text: "hello" } },
      } as any,
      req,
    );

    await controller.sendMessage(
      {
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: { text: { text: "hello" } },
      } as any,
      req,
    );

    const firstCallPayload = messageService.sendMessage.mock.calls[0][0];
    const secondCallPayload = messageService.sendMessage.mock.calls[1][0];
    expect(firstCallPayload.clientSeq).toEqual(secondCallPayload.clientSeq);
    expect(Number.isInteger(firstCallPayload.clientSeq)).toBe(true);
    expect(firstCallPayload.fromUserId).toBe("user-1");
  });

  it("should normalize versioned envelope with uppercase types and override client fromUserId", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    await controller.sendMessage(
      {
        version: 2,
        fromUserId: "spoofed-user",
        conversation: {
          type: "SINGLE",
          targetId: "user-2",
        },
        message: {
          type: "TEXT",
          text: {
            text: "hello v2",
          },
        },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: { "idempotency-key": "msg-v2-001" },
      } as any,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: {
          text: {
            text: "hello v2",
          },
        },
      }),
    );
  });

  it("should normalize event envelope into internal system message payload", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    await controller.sendMessage(
      {
        version: 2,
        conversation: {
          type: "GROUP",
          targetId: "group-1",
        },
        event: {
          type: "REACTION_ADDED",
          name: "message.reaction.added",
          data: {
            messageId: "msg-1",
            emoji: "thumbs_up",
          },
        },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: {},
      } as any,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUserId: "user-1",
        groupId: "group-1",
        type: "system",
        content: {
          event: {
            type: "REACTION_ADDED",
            name: "message.reaction.added",
            data: {
              messageId: "msg-1",
              emoji: "thumbs_up",
            },
          },
        },
      }),
    );
  });

  it("should normalize rtc signaling event into canonical rtc event payload", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    await controller.sendMessage(
      {
        version: 2,
        conversation: {
          type: "SINGLE",
          targetId: "user-2",
        },
        event: {
          type: "rtc_signal",
          name: "rtc.offer",
          data: {
            roomId: "room-1",
            toUserId: "user-2",
            signalType: "offer",
            payload: {
              sdp: "offer-sdp",
            },
          },
          metadata: {
            correlationId: "corr-1",
          },
        },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: {},
      } as any,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "system",
        content: {
          event: {
            type: "RTC_SIGNAL",
            name: "rtc.offer",
            data: {
              roomId: "room-1",
              toUserId: "user-2",
              signalType: "offer",
              payload: {
                sdp: "offer-sdp",
              },
            },
            metadata: {
              namespace: "rtc",
              version: 1,
              roomId: "room-1",
              correlationId: "corr-1",
            },
          },
        },
      }),
    );
  });

  it("should reject rtc signaling event without roomId", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.sendMessage(
        {
          version: 2,
          conversation: {
            type: "SINGLE",
            targetId: "user-2",
          },
          event: {
            type: "RTC_SIGNAL",
            name: "rtc.offer",
            data: {
              signalType: "offer",
              payload: {
                sdp: "offer-sdp",
              },
            },
          },
        } as any,
        {
          auth: { userId: "user-1" },
          headers: {},
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it("should reject rtc signaling offer event without sdp payload", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.sendMessage(
        {
          version: 2,
          conversation: {
            type: "SINGLE",
            targetId: "user-2",
          },
          event: {
            type: "RTC_SIGNAL",
            name: "rtc.offer",
            data: {
              roomId: "room-1",
              toUserId: "user-2",
              signalType: "offer",
              payload: {},
            },
          },
        } as any,
        {
          auth: { userId: "user-1" },
          headers: {},
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it("should normalize game event into canonical game namespace envelope", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    await controller.sendMessage(
      {
        version: 2,
        conversation: {
          type: "GROUP",
          targetId: "table-1",
        },
        event: {
          type: "game_event",
          name: "game.move",
          data: {
            tableId: "table-1",
            move: "discard",
          },
        },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: {},
      } as any,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "table-1",
        type: "system",
        content: {
          event: {
            type: "GAME_EVENT",
            name: "game.move",
            data: {
              tableId: "table-1",
              move: "discard",
            },
            metadata: {
              namespace: "game",
              version: 1,
            },
          },
        },
      }),
    );
  });

  it("should reject request when both message and event are provided in versioned envelope", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.sendMessage(
        {
          version: 2,
          conversation: {
            type: "SINGLE",
            targetId: "user-2",
          },
          message: {
            type: "TEXT",
            text: {
              text: "hello",
            },
          },
          event: {
            type: "REACTION_ADDED",
          },
        } as any,
        {
          auth: { userId: "user-1" },
          headers: {},
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it("should reject request when message payload does not match uppercase message type", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.sendMessage(
        {
          version: 2,
          conversation: {
            type: "SINGLE",
            targetId: "user-2",
          },
          message: {
            type: "TEXT",
            image: {
              url: "https://example.com/image.png",
            },
          },
        } as any,
        {
          auth: { userId: "user-1" },
          headers: {},
        } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(messageService.sendMessage).not.toHaveBeenCalled();
  });

  it("should keep explicit clientSeq when provided", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({ success: true });

    await controller.sendMessage(
      {
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: { text: { text: "hello" } },
        clientSeq: 778899,
        idempotencyKey: "msg-send-explicit-key",
      } as any,
      {
        auth: { userId: "user-1" },
        headers: { "idempotency-key": "msg-send-header" },
      } as any,
    );

    expect(messageService.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSeq: 778899,
      }),
    );
  });

  it("should attach dispatch envelope for successful send response", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({
      success: true,
      message: {
        id: "1900000000000000001",
        uuid: "uuid-1",
        status: MessageStatus.SENT,
      },
    });

    const result = await controller.sendMessage(
      {
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: { text: { text: "hello" } },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: {},
      } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        eventType: "messageSent",
        stateVersion: 1,
      }),
    );
    expect(result.eventId).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(typeof result.occurredAt).toBe("number");
  });

  it("should keep same eventId for identical successful send result payloads", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage
      .mockResolvedValueOnce({
        success: true,
        message: {
          id: "1900000000000000099",
          uuid: "uuid-stable-99",
          status: MessageStatus.SENT,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        message: {
          id: "1900000000000000099",
          uuid: "uuid-stable-99",
          status: MessageStatus.SENT,
        },
      });

    const payload = {
      fromUserId: "user-1",
      toUserId: "user-2",
      type: "text",
      content: { text: { text: "hello" } },
    } as any;
    const req = {
      auth: { userId: "user-1" },
      headers: {},
    } as any;

    const first = await controller.sendMessage(payload, req);
    const second = await controller.sendMessage(payload, req);

    expect(first.eventId).toBe(second.eventId);
    expect(first.eventType).toBe("messageSent");
    expect(second.eventType).toBe("messageSent");
  });

  it("should attach dispatch envelope for failed send response", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessage.mockResolvedValue({
      success: false,
      error: "send failed",
      errorCode: "SEND_FAILED",
    });

    const result = await controller.sendMessage(
      {
        fromUserId: "user-1",
        toUserId: "user-2",
        type: "text",
        content: { text: { text: "hello" } },
      } as any,
      {
        auth: { userId: "user-1" },
        headers: {},
      } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        eventType: "messageFailed",
        stateVersion: -1,
      }),
    );
    expect(result.eventId).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(typeof result.occurredAt).toBe("number");
  });

  it("should derive different clientSeq for each batch item from request idempotency key", async () => {
    const { controller, messageService } = createController();
    messageService.sendMessageBatch.mockResolvedValue({
      success: true,
      results: [
        {
          success: true,
          message: { id: "msg-1", uuid: "uuid-1", status: MessageStatus.SENT },
        },
        { success: false, error: "failed-2", errorCode: "SEND_FAILED" },
      ],
      processedCount: 0,
      failedCount: 0,
    });

    const response = await controller.batchSendMessages(
      {
        messages: [
          {
            fromUserId: "user-1",
            toUserId: "user-2",
            type: "text",
            content: { text: { text: "hello-1" } },
          },
          {
            fromUserId: "user-1",
            toUserId: "user-3",
            type: "text",
            content: { text: { text: "hello-2" } },
          },
        ],
      } as any,
      {
        auth: { userId: "user-1" },
        headers: { "idempotency-key": "batch-send-001" },
      } as any,
    );

    const normalizedBatch = messageService.sendMessageBatch.mock.calls[0][0];
    expect(normalizedBatch[0].clientSeq).toBeDefined();
    expect(normalizedBatch[1].clientSeq).toBeDefined();
    expect(normalizedBatch[0].clientSeq).not.toEqual(
      normalizedBatch[1].clientSeq,
    );
    expect(response[0]).toEqual(
      expect.objectContaining({
        eventType: "messageSent",
        stateVersion: 1,
      }),
    );
    expect(response[1]).toEqual(
      expect.objectContaining({
        eventType: "messageFailed",
        stateVersion: -1,
      }),
    );
  });

  it("should use authenticated deviceId when acking conversation seq", async () => {
    const { controller, messageService } = createController();
    messageService.ackConversationSeq.mockResolvedValue({ success: true });

    await controller.ackConversationSeq(
      {
        targetId: "user-2",
        type: "single",
        ackSeq: 10,
      } as any,
      { auth: { userId: "user-1", deviceId: "trusted-ios" } } as any,
    );

    expect(messageService.ackConversationSeq).toHaveBeenCalledWith(
      "user-1",
      {
        targetId: "user-2",
        type: "single",
        ackSeq: 10,
      },
      { deviceId: "trusted-ios" },
    );
  });

  it("should edit a message using the authenticated userId", async () => {
    const { controller, messageService } = createController();
    messageService.editMessage.mockResolvedValue({
      success: true,
      message: {
        id: "msg-1",
        status: MessageStatus.SENT,
        fromUserId: "user-1",
        toUserId: "user-2",
        editedAt: new Date("2026-03-14T12:00:00.000Z"),
      },
    });

    const result = await controller.editMessage(
      "msg-1",
      {
        content: {
          text: {
            text: "edited copy",
          },
        },
      } as any,
      { auth: { userId: "user-1" } } as any,
    );

    expect(messageService.editMessage).toHaveBeenCalledWith("msg-1", "user-1", {
      content: {
        text: {
          text: "edited copy",
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.objectContaining({
          id: "msg-1",
        }),
      }),
    );
  });

  it("should set a message reaction using the authenticated userId", async () => {
    const { controller, messageService, messageReactionService } =
      createController();
    messageReactionService.setReaction.mockResolvedValue({
      messageId: "msg-1",
      totalReactions: 1,
      items: [{ emoji: "👍", count: 1, reacted: true }],
    });
    messageService.getMessageById.mockResolvedValue({
      id: "msg-1",
      status: MessageStatus.SENT,
      fromUserId: "user-2",
      toUserId: "user-1",
    });

    const result = await controller.setMessageReaction(
      "msg-1",
      {
        emoji: "👍",
        active: true,
      } as any,
      { auth: { userId: "user-1" } } as any,
    );

    expect(messageReactionService.setReaction).toHaveBeenCalledWith(
      "msg-1",
      "user-1",
      "👍",
      true,
    );
    expect(result).toEqual(
      expect.objectContaining({
        messageId: "msg-1",
        totalReactions: 1,
        items: expect.arrayContaining([
          expect.objectContaining({
            emoji: "👍",
            count: 1,
            reacted: true,
          }),
        ]),
      }),
    );
  });

  it("should reject mismatched deviceId in single ack request", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.ackConversationSeq(
        {
          targetId: "user-2",
          type: "single",
          ackSeq: 10,
          deviceId: "spoofed-device",
        } as any,
        { auth: { userId: "user-1", deviceId: "trusted-ios" } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageService.ackConversationSeq).not.toHaveBeenCalled();
  });

  it("should reject body deviceId when authenticated context has no bound deviceId in batch ack", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.ackConversationSeqBatch(
        {
          items: [{ targetId: "group-1", type: "group", ackSeq: 20 }],
          deviceId: "web-01",
        } as any,
        { auth: { userId: "user-1" } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
  });

  it("should reject mismatched deviceId in batch ack request", async () => {
    const { controller, messageService } = createController();

    await expect(
      controller.ackConversationSeqBatch(
        {
          items: [{ targetId: "user-2", type: "single", ackSeq: 1 }],
          deviceId: "spoofed-device",
        } as any,
        { auth: { userId: "user-1", deviceId: "trusted-ios" } } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageService.ackConversationSeqBatch).not.toHaveBeenCalled();
  });
});
