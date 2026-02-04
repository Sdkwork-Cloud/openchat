import { describe, it, expect, beforeEach } from 'vitest';
import { toolchainService } from '../services/toolchain.service';

describe('ToolchainService', () => {
  beforeEach(() => {
    // 初始化服务
    toolchainService.initialize();
  });

  it('should initialize without errors', () => {
    expect(() => {
      toolchainService.initialize();
    }).not.toThrow();
  });

  it('should generate component', () => {
    const result = toolchainService.generateComponent({
      name: 'test-component',
      type: 'functional',
      withProps: true,
      withState: true,
      withEffects: true,
      withStyles: true,
      withTests: true
    });

    expect(result).toBeDefined();
    expect(result.component).toBeTruthy();
    expect(result.test).toBeTruthy();
    expect(result.style).toBeTruthy();
  });

  it('should generate service', () => {
    const result = toolchainService.generateService({
      name: 'test-service',
      withInterface: true,
      withImplementation: true,
      withTests: true
    });

    expect(result).toBeDefined();
    expect(result.interface).toBeTruthy();
    expect(result.implementation).toBeTruthy();
    expect(result.test).toBeTruthy();
  });

  it('should get config', () => {
    const config = toolchainService.getConfig();
    expect(config).toBeDefined();
    expect(config.codeGenerator).toBeDefined();
    expect(config.linting).toBeDefined();
    expect(config.formatting).toBeDefined();
    expect(config.testing).toBeDefined();
    expect(config.build).toBeDefined();
  });

  it('should update config', () => {
    const originalConfig = toolchainService.getConfig();
    const newConfig = {
      linting: {
        enabled: false,
        extensions: ['.ts', '.tsx'],
        ignorePaths: ['node_modules', 'dist']
      }
    };

    toolchainService.updateConfig(newConfig);
    const updatedConfig = toolchainService.getConfig();
    expect(updatedConfig.linting.enabled).toBe(false);
    expect(updatedConfig.linting.extensions).toEqual(['.ts', '.tsx']);
    expect(updatedConfig.linting.ignorePaths).toEqual(['node_modules', 'dist']);

    // 恢复原始配置
    toolchainService.updateConfig({ linting: originalConfig.linting });
  });

  it('should use default options when not provided', () => {
    const result = toolchainService.generateComponent({});
    expect(result).toBeDefined();
    expect(result.component).toBeTruthy();
  });

  it('should override default options when provided', () => {
    const result = toolchainService.generateComponent({
      name: 'custom-component',
      type: 'class',
      withProps: false,
      withState: false,
      withEffects: false,
      withStyles: false,
      withTests: false
    });

    expect(result).toBeDefined();
    expect(result.component).toBeTruthy();
    expect(result.test).toBeUndefined();
    expect(result.style).toBeUndefined();
  });
});
