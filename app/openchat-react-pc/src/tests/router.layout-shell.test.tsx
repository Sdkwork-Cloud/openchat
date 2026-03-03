import { render, waitFor } from "@testing-library/react";
import { MainLayout, sidebarNavItems } from "@sdkwork/openchat-pc-commons";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRouter } from "../router";

vi.mock("@sdkwork/openchat-pc-rtc", async () => {
  const actual = await vi.importActual<typeof import("@sdkwork/openchat-pc-rtc")>(
    "@sdkwork/openchat-pc-rtc",
  );

  return {
    ...actual,
    useRTC: () => ({
      session: null,
      localStream: null,
      remoteStream: null,
      isInCall: false,
      isCalling: false,
      isRinging: false,
      isConnected: false,
      initiateCall: async () => false,
      acceptCall: async () => false,
      rejectCall: async () => false,
      hangup: async () => false,
      toggleMute: async () => undefined,
      toggleCamera: async () => undefined,
      toggleSpeaker: async () => undefined,
      handleIncomingCall: () => undefined,
      handleSignal: async () => undefined,
    }),
  };
});

describe("router layout shell contract", () => {
  it("renders all sidebar routes inside a stable layout shell", async () => {
    const uniquePaths = Array.from(
      new Set([...sidebarNavItems.map((item) => item.path), "/settings"]),
    );

    for (const path of uniquePaths) {
      const { container, unmount } = render(
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <MainLayout>
            <AppRouter />
          </MainLayout>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="route-shell"]')).toBeTruthy();
      });

      expect(container.textContent).not.toContain("Page failed to render");

      const mainElement = container.querySelector("main");
      expect(mainElement).toBeTruthy();
      expect(mainElement).toHaveClass("min-h-0");
      expect(mainElement).toHaveClass("overflow-hidden");

      unmount();
    }
  });
});
