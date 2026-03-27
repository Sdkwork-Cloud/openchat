import { ValidationPipe } from "@nestjs/common";
import { SendMessage } from "./message.dto";

describe("SendMessage DTO", () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });

  async function transform(payload: unknown): Promise<SendMessage> {
    return validationPipe.transform(payload, {
      type: "body",
      metatype: SendMessage,
    });
  }

  it("accepts a versioned SDK text envelope without legacy content fields", async () => {
    await expect(
      transform({
        version: 2,
        conversation: {
          type: "SINGLE",
          targetId: "user-2",
        },
        message: {
          type: "TEXT",
          text: {
            text: "hello from sdk",
          },
        },
      }),
    ).resolves.toBeInstanceOf(SendMessage);
  });

  it("accepts a versioned SDK event envelope without legacy content fields", async () => {
    await expect(
      transform({
        version: 2,
        conversation: {
          type: "GROUP",
          targetId: "group-1",
        },
        event: {
          type: "RTC_SIGNAL",
          name: "rtc.offer",
          data: {
            roomId: "room-1",
          },
        },
      }),
    ).resolves.toBeInstanceOf(SendMessage);
  });

  it("still rejects legacy payloads that omit content", async () => {
    await expect(
      transform({
        toUserId: "user-2",
        type: "text",
      }),
    ).rejects.toThrow();
  });
});
