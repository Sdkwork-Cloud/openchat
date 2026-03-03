import { codeGenerator } from '../tools/code-generator';
import { toolchainConfig } from '../tools/toolchain.config';
import { ComponentTemplateOptions, ServiceTemplateOptions } from '../tools/code-generator';

export interface ToolchainService {
  initialize(): void;
  generateComponent(options: Partial<ComponentTemplateOptions>): {
    component: string;
    test?: string;
    style?: string;
  };
  generateService(options: Partial<ServiceTemplateOptions>): {
    interface?: string;
    implementation: string;
    test?: string;
  };
  getConfig(): typeof toolchainConfig;
  updateConfig(config: Partial<typeof toolchainConfig>): void;
}

export class ToolchainServiceImpl implements ToolchainService {
  private config = { ...toolchainConfig };

  initialize(): void {
    console.log('[Toolchain] Initialized with config:', this.config);
  }

  generateComponent(options: Partial<ComponentTemplateOptions>): {
    component: string;
    test?: string;
    style?: string;
  } {
    const mergedOptions: ComponentTemplateOptions = {
      ...this.config.codeGenerator.defaultComponentOptions,
      ...options,
      name: options.name || 'component',
      path: options.path || './packages/sdkwork-openchat-pc-commons/src/components'
    };

    return codeGenerator.generateComponent(mergedOptions);
  }

  generateService(options: Partial<ServiceTemplateOptions>): {
    interface?: string;
    implementation: string;
    test?: string;
  } {
    const mergedOptions: ServiceTemplateOptions = {
      ...this.config.codeGenerator.defaultServiceOptions,
      ...options,
      name: options.name || 'service',
      path: options.path || './packages/sdkwork-openchat-pc-commons/src/services'
    };

    return codeGenerator.generateService(mergedOptions);
  }

  getConfig(): typeof toolchainConfig {
    return this.config;
  }

  updateConfig(config: Partial<typeof toolchainConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    console.log('[Toolchain] Config updated:', this.config);
  }
}

// 瀵煎嚭鍗曚緥瀹炰緥
export const toolchainService = new ToolchainServiceImpl();

