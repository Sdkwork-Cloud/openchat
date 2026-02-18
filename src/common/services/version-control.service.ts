import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Version<T = any> {
  id: string;
  entityId: string;
  entityType: string;
  version: number;
  data: T;
  changes?: string[];
  author?: string;
  authorId?: string;
  timestamp: number;
  parentVersionId?: string;
  tags: string[];
  metadata: Record<string, any>;
  checksum: string;
}

export interface VersionDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  unchanged: string[];
}

export interface VersionBranch {
  id: string;
  name: string;
  entityId: string;
  entityType: string;
  baseVersionId: string;
  headVersionId: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

export interface VersionQuery {
  entityId?: string;
  entityType?: string;
  authorId?: string;
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface VersionControlOptions {
  maxVersions?: number;
  enableBranches?: boolean;
  enableDiff?: boolean;
  computeChecksum?: boolean;
  onVersionCreated?: (version: Version) => void;
  onVersionRestored?: (version: Version) => void;
}

export interface VersionControlStats {
  totalVersions: number;
  totalEntities: number;
  totalBranches: number;
  versionsByEntityType: Record<string, number>;
  averageVersionsPerEntity: number;
}

@Injectable()
export class VersionControlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VersionControlService.name);
  private readonly repositories = new Map<string, {
    versions: Map<string, Version[]>;
    branches: Map<string, VersionBranch>;
    options: Required<VersionControlOptions>;
    stats: {
      totalVersions: number;
      versionsByEntityType: Record<string, number>;
    };
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('VersionControlService initialized');
  }

  onModuleDestroy() {
    this.repositories.clear();
  }

  createRepository(name: string, options?: VersionControlOptions): void {
    if (this.repositories.has(name)) {
      throw new Error(`Repository '${name}' already exists`);
    }

    const defaultOptions: Required<VersionControlOptions> = {
      maxVersions: options?.maxVersions ?? 100,
      enableBranches: options?.enableBranches ?? true,
      enableDiff: options?.enableDiff ?? true,
      computeChecksum: options?.computeChecksum ?? true,
      onVersionCreated: options?.onVersionCreated ?? (() => {}),
      onVersionRestored: options?.onVersionRestored ?? (() => {}),
    };

    this.repositories.set(name, {
      versions: new Map(),
      branches: new Map(),
      options: defaultOptions,
      stats: {
        totalVersions: 0,
        versionsByEntityType: {},
      },
    });

    this.logger.log(`Repository '${name}' created`);
  }

  createVersion<T = any>(
    repositoryName: string,
    entityId: string,
    entityType: string,
    data: T,
    options?: {
      changes?: string[];
      author?: string;
      authorId?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      parentVersionId?: string;
    },
  ): Version<T> {
    const repo = this.repositories.get(repositoryName);
    if (!repo) {
      throw new Error(`Repository '${repositoryName}' not found`);
    }

    if (!repo.versions.has(entityId)) {
      repo.versions.set(entityId, []);
    }

    const entityVersions = repo.versions.get(entityId)!;
    const versionNumber = entityVersions.length + 1;

    const version: Version<T> = {
      id: this.generateVersionId(),
      entityId,
      entityType,
      version: versionNumber,
      data,
      changes: options?.changes,
      author: options?.author,
      authorId: options?.authorId,
      timestamp: Date.now(),
      parentVersionId: options?.parentVersionId || (entityVersions.length > 0 ? entityVersions[entityVersions.length - 1].id : undefined),
      tags: options?.tags || [],
      metadata: options?.metadata || {},
      checksum: repo.options.computeChecksum ? this.computeChecksum(data) : '',
    };

    entityVersions.push(version);

    repo.stats.totalVersions++;
    repo.stats.versionsByEntityType[entityType] = (repo.stats.versionsByEntityType[entityType] || 0) + 1;

    while (entityVersions.length > repo.options.maxVersions) {
      entityVersions.shift();
    }

    repo.options.onVersionCreated(version);

    return version;
  }

  getVersion<T = any>(repositoryName: string, versionId: string): Version<T> | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    for (const versions of repo.versions.values()) {
      const version = versions.find(v => v.id === versionId);
      if (version) return version as Version<T>;
    }

    return undefined;
  }

  getVersionByNumber<T = any>(
    repositoryName: string,
    entityId: string,
    versionNumber: number,
  ): Version<T> | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    const versions = repo.versions.get(entityId);
    if (!versions) return undefined;

    return versions.find(v => v.version === versionNumber) as Version<T> | undefined;
  }

  getLatestVersion<T = any>(repositoryName: string, entityId: string): Version<T> | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    const versions = repo.versions.get(entityId);
    if (!versions || versions.length === 0) return undefined;

    return versions[versions.length - 1] as Version<T>;
  }

  getEntityHistory<T = any>(repositoryName: string, entityId: string): Version<T>[] {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return [];

    return (repo.versions.get(entityId) || []) as Version<T>[];
  }

  query(repositoryName: string, query: VersionQuery): Version[] {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return [];

    let versions: Version[] = [];

    if (query.entityId) {
      versions = repo.versions.get(query.entityId) || [];
    } else {
      for (const v of repo.versions.values()) {
        versions.push(...v);
      }
    }

    if (query.entityType) {
      versions = versions.filter(v => v.entityType === query.entityType);
    }

    if (query.authorId) {
      versions = versions.filter(v => v.authorId === query.authorId);
    }

    if (query.fromVersion !== undefined) {
      versions = versions.filter(v => v.version >= query.fromVersion!);
    }

    if (query.toVersion !== undefined) {
      versions = versions.filter(v => v.version <= query.toVersion!);
    }

    if (query.fromTimestamp !== undefined) {
      versions = versions.filter(v => v.timestamp >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      versions = versions.filter(v => v.timestamp <= query.toTimestamp!);
    }

    if (query.tags && query.tags.length > 0) {
      versions = versions.filter(v =>
        query.tags!.some(tag => v.tags.includes(tag))
      );
    }

    versions.sort((a, b) => b.timestamp - a.timestamp);

    if (query.offset !== undefined) {
      versions = versions.slice(query.offset);
    }

    if (query.limit !== undefined) {
      versions = versions.slice(0, query.limit);
    }

    return versions;
  }

  compare<T = any>(
    repositoryName: string,
    versionId1: string,
    versionId2: string,
  ): VersionDiff | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    const version1 = this.getVersion<T>(repositoryName, versionId1);
    const version2 = this.getVersion<T>(repositoryName, versionId2);

    if (!version1 || !version2) return undefined;

    return this.computeDiff(version1.data, version2.data);
  }

  compareVersions<T = any>(
    repositoryName: string,
    entityId: string,
    versionNumber1: number,
    versionNumber2: number,
  ): VersionDiff | undefined {
    const version1 = this.getVersionByNumber<T>(repositoryName, entityId, versionNumber1);
    const version2 = this.getVersionByNumber<T>(repositoryName, entityId, versionNumber2);

    if (!version1 || !version2) return undefined;

    return this.computeDiff(version1.data, version2.data);
  }

  restore<T = any>(
    repositoryName: string,
    versionId: string,
    options?: {
      author?: string;
      authorId?: string;
      reason?: string;
    },
  ): Version<T> | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    const version = this.getVersion<T>(repositoryName, versionId);
    if (!version) return undefined;

    const restoredVersion = this.createVersion<T>(
      repositoryName,
      version.entityId,
      version.entityType,
      version.data,
      {
        changes: [`Restored from version ${version.version}`, options?.reason].filter((s): s is string => Boolean(s)),
        author: options?.author,
        authorId: options?.authorId,
        tags: ['restored'],
        parentVersionId: versionId,
      },
    );

    repo.options.onVersionRestored(restoredVersion);

    return restoredVersion;
  }

  createBranch(
    repositoryName: string,
    entityId: string,
    name: string,
    baseVersionId: string,
    metadata?: Record<string, any>,
  ): VersionBranch | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo || !repo.options.enableBranches) return undefined;

    const baseVersion = this.getVersion(repositoryName, baseVersionId);
    if (!baseVersion) return undefined;

    const branch: VersionBranch = {
      id: this.generateBranchId(),
      name,
      entityId,
      entityType: baseVersion.entityType,
      baseVersionId,
      headVersionId: baseVersionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: metadata || {},
    };

    repo.branches.set(branch.id, branch);

    return branch;
  }

  getBranch(repositoryName: string, branchId: string): VersionBranch | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    return repo.branches.get(branchId);
  }

  getBranches(repositoryName: string, entityId?: string): VersionBranch[] {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return [];

    let branches = Array.from(repo.branches.values());

    if (entityId) {
      branches = branches.filter(b => b.entityId === entityId);
    }

    return branches;
  }

  mergeBranch(
    repositoryName: string,
    branchId: string,
    options?: {
      author?: string;
      authorId?: string;
      strategy?: 'ours' | 'theirs' | 'manual';
      resolver?: (base: any, ours: any, theirs: any) => any;
    },
  ): Version | undefined {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return undefined;

    const branch = repo.branches.get(branchId);
    if (!branch) return undefined;

    const baseVersion = this.getVersion(repositoryName, branch.baseVersionId);
    const headVersion = this.getVersion(repositoryName, branch.headVersionId);
    const latestVersion = this.getLatestVersion(repositoryName, branch.entityId);

    if (!baseVersion || !headVersion || !latestVersion) return undefined;

    let mergedData: any;

    if (options?.strategy === 'ours') {
      mergedData = latestVersion.data;
    } else if (options?.strategy === 'theirs') {
      mergedData = headVersion.data;
    } else if (options?.resolver) {
      mergedData = options.resolver(baseVersion.data, latestVersion.data, headVersion.data);
    } else {
      mergedData = { ...latestVersion.data, ...headVersion.data };
    }

    const mergedVersion = this.createVersion(
      repositoryName,
      branch.entityId,
      branch.entityType,
      mergedData,
      {
        changes: [`Merged branch '${branch.name}'`],
        author: options?.author,
        authorId: options?.authorId,
        tags: ['merged'],
        metadata: { branchId, baseVersionId: branch.baseVersionId },
      },
    );

    branch.headVersionId = mergedVersion.id;
    branch.updatedAt = Date.now();

    return mergedVersion;
  }

  tagVersion(repositoryName: string, versionId: string, tag: string): boolean {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return false;

    const version = this.getVersion(repositoryName, versionId);
    if (!version) return false;

    if (!version.tags.includes(tag)) {
      version.tags.push(tag);
    }

    return true;
  }

  getStats(repositoryName: string): VersionControlStats {
    const repo = this.repositories.get(repositoryName);
    if (!repo) {
      throw new Error(`Repository '${repositoryName}' not found`);
    }

    const totalEntities = repo.versions.size;
    const avgVersions = totalEntities > 0 ? repo.stats.totalVersions / totalEntities : 0;

    return {
      totalVersions: repo.stats.totalVersions,
      totalEntities,
      totalBranches: repo.branches.size,
      versionsByEntityType: { ...repo.stats.versionsByEntityType },
      averageVersionsPerEntity: avgVersions,
    };
  }

  deleteVersion(repositoryName: string, versionId: string): boolean {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return false;

    for (const [entityId, versions] of repo.versions) {
      const index = versions.findIndex(v => v.id === versionId);
      if (index !== -1) {
        versions.splice(index, 1);
        repo.stats.totalVersions--;
        return true;
      }
    }

    return false;
  }

  deleteEntity(repositoryName: string, entityId: string): number {
    const repo = this.repositories.get(repositoryName);
    if (!repo) return 0;

    const versions = repo.versions.get(entityId);
    if (!versions) return 0;

    const count = versions.length;
    repo.versions.delete(entityId);
    repo.stats.totalVersions -= count;

    for (const [branchId, branch] of repo.branches) {
      if (branch.entityId === entityId) {
        repo.branches.delete(branchId);
      }
    }

    return count;
  }

  destroyRepository(repositoryName: string): boolean {
    return this.repositories.delete(repositoryName);
  }

  private computeDiff(oldData: any, newData: any): VersionDiff {
    const diff: VersionDiff = {
      added: {},
      removed: {},
      changed: [],
      unchanged: [],
    };

    const oldKeys = new Set(Object.keys(oldData || {}));
    const newKeys = new Set(Object.keys(newData || {}));

    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        diff.added[key] = newData[key];
      } else if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        diff.changed.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key],
        });
      } else {
        diff.unchanged.push(key);
      }
    }

    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        diff.removed[key] = oldData[key];
      }
    }

    return diff;
  }

  private computeChecksum(data: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
