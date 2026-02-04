import { describe, it, expect, beforeEach } from 'vitest';
import { featureService } from '../services/feature.service';

describe('FeatureService', () => {
  beforeEach(() => {
    // 初始化服务以确保默认功能已注册
    featureService.initialize();
  });

  it('should initialize without errors', () => {
    expect(() => {
      featureService.initialize();
    }).not.toThrow();
  });

  it('should check if a feature is enabled', () => {
    // 测试默认功能
    expect(featureService.isFeatureEnabled('webSocket.enable')).toBe(true);
    expect(featureService.isFeatureEnabled('fileUpload.enable')).toBe(true);
    expect(featureService.isFeatureEnabled('microfrontends.enable')).toBe(false);
  });

  it('should enable a feature', () => {
    // 先禁用一个功能
    featureService.disableFeature('webSocket.enable');
    expect(featureService.isFeatureEnabled('webSocket.enable')).toBe(false);

    // 再启用它
    const result = featureService.enableFeature('webSocket.enable');
    expect(result).toBe(true);
    expect(featureService.isFeatureEnabled('webSocket.enable')).toBe(true);
  });

  it('should disable a feature', () => {
    // 确保功能是启用的
    featureService.enableFeature('webSocket.enable');
    expect(featureService.isFeatureEnabled('webSocket.enable')).toBe(true);

    // 禁用它
    const result = featureService.disableFeature('webSocket.enable');
    expect(result).toBe(true);
    expect(featureService.isFeatureEnabled('webSocket.enable')).toBe(false);
  });

  it('should toggle a feature', () => {
    // 保存初始状态
    const initialState = featureService.isFeatureEnabled('webSocket.enable');

    // 切换状态
    const newState = featureService.toggleFeature('webSocket.enable');
    expect(newState).toBe(!initialState);

    // 再次切换回初始状态
    const finalState = featureService.toggleFeature('webSocket.enable');
    expect(finalState).toBe(initialState);
  });

  it('should get a feature', () => {
    const feature = featureService.getFeature('webSocket.enable');
    expect(feature).toBeDefined();
    expect(feature?.key).toBe('webSocket.enable');
  });

  it('should get all features', () => {
    const features = featureService.getAllFeatures();
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
  });

  it('should register a new feature', () => {
    const newFeature = featureService.registerFeature({
      key: 'test.feature',
      name: 'Test Feature',
      description: 'A test feature',
      enabled: true
    });

    expect(newFeature).toBeDefined();
    expect(newFeature.key).toBe('test.feature');
    expect(newFeature.enabled).toBe(true);
  });

  it('should update a feature', () => {
    const updatedFeature = featureService.updateFeature('webSocket.enable', {
      name: 'Updated WebSocket Support',
      description: 'Updated description for WebSocket support'
    });

    expect(updatedFeature).toBeDefined();
    expect(updatedFeature?.name).toBe('Updated WebSocket Support');
    expect(updatedFeature?.description).toBe('Updated description for WebSocket support');
  });

  it('should delete a feature', () => {
    // 先注册一个测试功能
    featureService.registerFeature({
      key: 'test.feature.to.delete',
      name: 'Test Feature to Delete',
      description: 'A test feature to delete',
      enabled: true
    });

    // 确认功能已注册
    expect(featureService.getFeature('test.feature.to.delete')).toBeDefined();

    // 删除功能
    const result = featureService.deleteFeature('test.feature.to.delete');
    expect(result).toBe(true);

    // 确认功能已删除
    expect(featureService.getFeature('test.feature.to.delete')).toBeNull();
  });

  it('should handle feature changed callbacks', () => {
    let callbackCalled = false;
    let changedFeature: any = null;

    const testCallback = (feature: any) => {
      callbackCalled = true;
      changedFeature = feature;
    };

    // 注册回调
    featureService.onFeatureChanged(testCallback);

    // 触发功能变化
    featureService.toggleFeature('webSocket.enable');

    // 验证回调被调用
    expect(callbackCalled).toBe(true);
    expect(changedFeature).toBeDefined();
    expect(changedFeature.key).toBe('webSocket.enable');

    // 取消注册回调
    featureService.offFeatureChanged(testCallback);

    // 重置标志
    callbackCalled = false;

    // 再次触发功能变化
    featureService.toggleFeature('webSocket.enable');

    // 验证回调不再被调用
    expect(callbackCalled).toBe(false);
  });

  it('should return false for non-existent features', () => {
    expect(featureService.isFeatureEnabled('non.existent.feature')).toBe(false);
    expect(featureService.enableFeature('non.existent.feature')).toBe(false);
    expect(featureService.disableFeature('non.existent.feature')).toBe(false);
    expect(featureService.toggleFeature('non.existent.feature')).toBe(false);
    expect(featureService.getFeature('non.existent.feature')).toBeNull();
    expect(featureService.updateFeature('non.existent.feature', {})).toBeNull();
    expect(featureService.deleteFeature('non.existent.feature')).toBe(false);
  });
});
