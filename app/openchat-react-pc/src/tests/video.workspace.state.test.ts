import { beforeEach, describe, expect, it } from "vitest";
import { VideoService } from "../../packages/sdkwork-openchat-pc-video/src/services/VideoService";

describe("video workspace state", () => {
  beforeEach(() => {
    VideoService.resetWorkspaceState();
  });

  it("toggles favorite videos", () => {
    const videoId = `video-favorite-${Date.now()}`;

    const enabled = VideoService.toggleFavoriteVideo(videoId);
    expect(enabled).toBe(true);
    expect(VideoService.isVideoFavorite(videoId)).toBe(true);

    const disabled = VideoService.toggleFavoriteVideo(videoId);
    expect(disabled).toBe(false);
    expect(VideoService.isVideoFavorite(videoId)).toBe(false);
  });

  it("keeps recent opened video order", () => {
    const first = `video-recent-a-${Date.now()}`;
    const second = `video-recent-b-${Date.now()}`;

    VideoService.markVideoOpened(first);
    const order = VideoService.markVideoOpened(second);
    const reordered = VideoService.markVideoOpened(first);

    expect(order[0]).toBe(second);
    expect(reordered[0]).toBe(first);
    expect(reordered[1]).toBe(second);
  });
});
