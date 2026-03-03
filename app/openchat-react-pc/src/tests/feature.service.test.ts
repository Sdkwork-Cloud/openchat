import { beforeEach, describe, expect, it } from "vitest";
import { featureService } from "@sdkwork/openchat-pc-kernel";

describe("FeatureService", () => {
  beforeEach(() => {
    featureService.initialize();
  });

  it("should initialize without errors", () => {
    expect(() => {
      featureService.initialize();
    }).not.toThrow();
  });

  it("should check if a feature is enabled", () => {
    expect(featureService.isFeatureEnabled("webSocket.enable")).toBe(true);
    expect(featureService.isFeatureEnabled("fileUpload.enable")).toBe(true);
    expect(featureService.isFeatureEnabled("microfrontends.enable")).toBe(false);
  });

  it("should enable a feature", () => {
    featureService.disableFeature("webSocket.enable");
    expect(featureService.isFeatureEnabled("webSocket.enable")).toBe(false);

    const result = featureService.enableFeature("webSocket.enable");
    expect(result).toBe(true);
    expect(featureService.isFeatureEnabled("webSocket.enable")).toBe(true);
  });

  it("should disable a feature", () => {
    featureService.enableFeature("webSocket.enable");
    expect(featureService.isFeatureEnabled("webSocket.enable")).toBe(true);

    const result = featureService.disableFeature("webSocket.enable");
    expect(result).toBe(true);
    expect(featureService.isFeatureEnabled("webSocket.enable")).toBe(false);
  });

  it("should toggle a feature", () => {
    const initialState = featureService.isFeatureEnabled("webSocket.enable");

    const newState = featureService.toggleFeature("webSocket.enable");
    expect(newState).toBe(!initialState);

    const finalState = featureService.toggleFeature("webSocket.enable");
    expect(finalState).toBe(initialState);
  });

  it("should get a feature", () => {
    const feature = featureService.getFeature("webSocket.enable");
    expect(feature).toBeDefined();
    expect(feature?.key).toBe("webSocket.enable");
  });

  it("should get all features", () => {
    const features = featureService.getAllFeatures();
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
  });

  it("should register a new feature", () => {
    const newFeature = featureService.registerFeature({
      key: "test.feature",
      name: "Test Feature",
      description: "A test feature",
      enabled: true,
    });

    expect(newFeature).toBeDefined();
    expect(newFeature.key).toBe("test.feature");
    expect(newFeature.enabled).toBe(true);
  });

  it("should update a feature", () => {
    const updatedFeature = featureService.updateFeature("webSocket.enable", {
      name: "Updated WebSocket Support",
      description: "Updated description for WebSocket support",
    });

    expect(updatedFeature).toBeDefined();
    expect(updatedFeature?.name).toBe("Updated WebSocket Support");
    expect(updatedFeature?.description).toBe("Updated description for WebSocket support");
  });

  it("should delete a feature", () => {
    featureService.registerFeature({
      key: "test.feature.to.delete",
      name: "Test Feature to Delete",
      description: "A test feature to delete",
      enabled: true,
    });

    expect(featureService.getFeature("test.feature.to.delete")).toBeDefined();

    const result = featureService.deleteFeature("test.feature.to.delete");
    expect(result).toBe(true);
    expect(featureService.getFeature("test.feature.to.delete")).toBeNull();
  });

  it("should handle feature changed callbacks", () => {
    let callbackCalled = false;
    let changedFeature: any = null;

    const testCallback = (feature: any) => {
      callbackCalled = true;
      changedFeature = feature;
    };

    featureService.onFeatureChanged(testCallback);
    featureService.toggleFeature("webSocket.enable");

    expect(callbackCalled).toBe(true);
    expect(changedFeature).toBeDefined();
    expect(changedFeature.key).toBe("webSocket.enable");

    featureService.offFeatureChanged(testCallback);
    callbackCalled = false;
    featureService.toggleFeature("webSocket.enable");

    expect(callbackCalled).toBe(false);
  });

  it("should return false for non-existent features", () => {
    expect(featureService.isFeatureEnabled("non.existent.feature")).toBe(false);
    expect(featureService.enableFeature("non.existent.feature")).toBe(false);
    expect(featureService.disableFeature("non.existent.feature")).toBe(false);
    expect(featureService.toggleFeature("non.existent.feature")).toBe(false);
    expect(featureService.getFeature("non.existent.feature")).toBeNull();
    expect(featureService.updateFeature("non.existent.feature", {})).toBeNull();
    expect(featureService.deleteFeature("non.existent.feature")).toBe(false);
  });
});
