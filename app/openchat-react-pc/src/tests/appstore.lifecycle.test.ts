import { beforeEach, describe, expect, it } from "vitest";
import {
  getAppInstallState,
  getAppInstallStateMap,
  getInstalledAppStates,
  getInstalledAppIds,
  installApp,
  markAppOpened,
  resetAppInstallState,
  uninstallApp,
} from "../../packages/sdkwork-openchat-pc-appstore/src/services/appstore.service";

const STORAGE_KEY = "openchat.appstore.install-state";

describe("appstore install lifecycle", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    resetAppInstallState();
  });

  it("tracks install and uninstall status", async () => {
    expect(getInstalledAppIds()).toEqual([]);
    expect(getAppInstallState("tool-clip").installed).toBe(false);

    const installedState = await installApp("tool-clip");
    expect(installedState.installed).toBe(true);
    expect(installedState.installedAt).not.toBeNull();
    expect(getInstalledAppIds()).toEqual(["tool-clip"]);

    await uninstallApp("tool-clip");
    expect(getInstalledAppIds()).toEqual([]);
    expect(getAppInstallState("tool-clip").installed).toBe(false);
  });

  it("records app open history for installed apps", async () => {
    await installApp("tool-inspector");

    markAppOpened("tool-inspector");
    const state = markAppOpened("tool-inspector");

    expect(state.installed).toBe(true);
    expect(state.openCount).toBe(2);
    expect(state.lastOpenedAt).not.toBeNull();
  });

  it("builds state map for app lists", async () => {
    await installApp("tool-clip");

    const stateMap = getAppInstallStateMap(["tool-clip", "plugin-theme-kit", "unknown"]);

    expect(stateMap["tool-clip"]?.installed).toBe(true);
    expect(stateMap["plugin-theme-kit"]?.installed).toBe(false);
    expect(stateMap.unknown?.installed).toBe(false);
  });

  it("returns installed lifecycle states sorted by recent activity", async () => {
    await installApp("tool-clip");
    await installApp("plugin-theme-kit");

    markAppOpened("plugin-theme-kit");
    markAppOpened("tool-clip");
    markAppOpened("tool-clip");

    const states = getInstalledAppStates();

    expect(states.map((item) => item.appId)).toEqual(["tool-clip", "plugin-theme-kit"]);
    expect(states[0]?.openCount).toBe(2);
    expect(states[0]?.lastOpenedAt).not.toBeNull();
    expect(states[1]?.openCount).toBe(1);
  });
});
