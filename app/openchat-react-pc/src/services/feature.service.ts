export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  expirationDate?: number;
}

export interface FeatureService {
  initialize(): void;
  isFeatureEnabled(key: string): boolean;
  enableFeature(key: string): boolean;
  disableFeature(key: string): boolean;
  toggleFeature(key: string): boolean;
  getFeature(key: string): FeatureFlag | null;
  getAllFeatures(): FeatureFlag[];
  registerFeature(feature: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag;
  updateFeature(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null;
  deleteFeature(key: string): boolean;
  onFeatureChanged(callback: (feature: FeatureFlag) => void): void;
  offFeatureChanged(callback: (feature: FeatureFlag) => void): void;
}

export class FeatureServiceImpl implements FeatureService {
  private features: Map<string, FeatureFlag> = new Map();
  private featureChangedCallbacks: Array<(feature: FeatureFlag) => void> = [];
  private storageKey = 'feature-flags';

  initialize(): void {
    this.loadFeaturesFromStorage();
    this.initializeDefaultFeatures();
  }

  isFeatureEnabled(key: string): boolean {
    const feature = this.features.get(key);
    return feature?.enabled || false;
  }

  enableFeature(key: string): boolean {
    const feature = this.features.get(key);
    if (!feature) {
      return false;
    }

    feature.enabled = true;
    feature.updatedAt = Date.now();
    this.saveFeaturesToStorage();
    this.notifyFeatureChanged(feature);
    return true;
  }

  disableFeature(key: string): boolean {
    const feature = this.features.get(key);
    if (!feature) {
      return false;
    }

    feature.enabled = false;
    feature.updatedAt = Date.now();
    this.saveFeaturesToStorage();
    this.notifyFeatureChanged(feature);
    return true;
  }

  toggleFeature(key: string): boolean {
    const feature = this.features.get(key);
    if (!feature) {
      return false;
    }

    feature.enabled = !feature.enabled;
    feature.updatedAt = Date.now();
    this.saveFeaturesToStorage();
    this.notifyFeatureChanged(feature);
    return feature.enabled;
  }

  getFeature(key: string): FeatureFlag | null {
    return this.features.get(key) || null;
  }

  getAllFeatures(): FeatureFlag[] {
    return Array.from(this.features.values());
  }

  registerFeature(feature: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag {
    const now = Date.now();
    const newFeature: FeatureFlag = {
      ...feature,
      createdAt: now,
      updatedAt: now
    };

    this.features.set(feature.key, newFeature);
    this.saveFeaturesToStorage();
    this.notifyFeatureChanged(newFeature);
    return newFeature;
  }

  updateFeature(key: string, updates: Partial<FeatureFlag>): FeatureFlag | null {
    const feature = this.features.get(key);
    if (!feature) {
      return null;
    }

    const updatedFeature: FeatureFlag = {
      ...feature,
      ...updates,
      updatedAt: Date.now()
    };

    this.features.set(key, updatedFeature);
    this.saveFeaturesToStorage();
    this.notifyFeatureChanged(updatedFeature);
    return updatedFeature;
  }

  deleteFeature(key: string): boolean {
    const removed = this.features.delete(key);
    if (removed) {
      this.saveFeaturesToStorage();
    }
    return removed;
  }

  onFeatureChanged(callback: (feature: FeatureFlag) => void): void {
    this.featureChangedCallbacks.push(callback);
  }

  offFeatureChanged(callback: (feature: FeatureFlag) => void): void {
    this.featureChangedCallbacks = this.featureChangedCallbacks.filter(cb => cb !== callback);
  }

  private loadFeaturesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const features = JSON.parse(stored) as FeatureFlag[];
        features.forEach(feature => {
          this.features.set(feature.key, feature);
        });
      }
    } catch (error) {
      console.error('Failed to load features from storage:', error);
    }
  }

  private saveFeaturesToStorage(): void {
    try {
      const features = Array.from(this.features.values());
      localStorage.setItem(this.storageKey, JSON.stringify(features));
    } catch (error) {
      console.error('Failed to save features to storage:', error);
    }
  }

  private notifyFeatureChanged(feature: FeatureFlag): void {
    this.featureChangedCallbacks.forEach(callback => {
      try {
        callback(feature);
      } catch (error) {
        console.error('Error in feature changed callback:', error);
      }
    });
  }

  private initializeDefaultFeatures(): void {
    const defaultFeatures: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'webSocket.enable',
        name: 'WebSocket Support',
        description: 'Enable real-time communication using WebSocket',
        enabled: true,
        tags: ['core', 'communication']
      },
      {
        key: 'fileUpload.enable',
        name: 'File Upload',
        description: 'Enable file upload functionality',
        enabled: true,
        tags: ['core', 'file']
      },
      {
        key: 'microfrontends.enable',
        name: 'Micro-frontend Support',
        description: 'Enable micro-frontend architecture',
        enabled: false,
        tags: ['architecture']
      },
      {
        key: 'performanceMonitoring.enable',
        name: 'Performance Monitoring',
        description: 'Enable performance monitoring and analytics',
        enabled: true,
        tags: ['monitoring']
      },
      {
        key: 'experimental.features',
        name: 'Experimental Features',
        description: 'Enable experimental features',
        enabled: false,
        tags: ['experimental']
      }
    ];

    defaultFeatures.forEach(feature => {
      if (!this.features.has(feature.key)) {
        this.registerFeature(feature);
      }
    });
  }
}

// 导出单例实例
export const featureService = new FeatureServiceImpl();
