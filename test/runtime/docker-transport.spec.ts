type DockerTransport = {
  kind: 'native' | 'wsl';
  distro?: string;
  user?: string;
};

type DockerTransportModule = {
  formatDockerTransport: (transport: DockerTransport) => string;
  resolveDockerTransport: (
    projectRoot: string,
    options?: {
      requireCompose?: boolean;
    },
  ) => DockerTransport;
  runCompose: (
    projectRoot: string,
    transport: DockerTransport,
    envFile: string,
    extraArgs: string[],
    options?: {
      timeout?: number;
    },
  ) => {
    status: number | null;
    stdout: string;
    stderr: string;
  };
};

describe('openchat docker transport', () => {
  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const originalWslDistro = process.env.OPENCHAT_WSL_DOCKER_DISTRO;

  afterEach(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(process, 'platform', originalPlatformDescriptor);
    }
    if (originalWslDistro === undefined) {
      delete process.env.OPENCHAT_WSL_DOCKER_DISTRO;
    } else {
      process.env.OPENCHAT_WSL_DOCKER_DISTRO = originalWslDistro;
    }
    jest.dontMock('../../scripts/lib/node/shared.cjs');
    jest.resetModules();
  });

  test('prefers native docker compose when docker engine is responsive', () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    const projectRoot = 'D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\openchat';
    const envFile = `${projectRoot}\\.env.test`;
    const runCommand = jest.fn((command: string, args: string[]) => {
      if (command === 'docker' && args.join(' ') === 'version') {
        return {
          status: 0,
          stdout: 'Server: Docker Desktop\n',
          stderr: '',
        };
      }

      if (command === 'docker' && args.join(' ') === 'compose version') {
        return {
          status: 0,
          stdout: 'Docker Compose version v2.34.0-desktop.1\n',
          stderr: '',
        };
      }

      if (command === 'docker' && args[0] === 'compose' && args.includes('ps')) {
        return {
          status: 0,
          stdout: 'NAME                        STATUS\nopenchat-test-postgres      running\n',
          stderr: '',
        };
      }

      return {
        status: 1,
        stdout: '',
        stderr: `unexpected command: ${command} ${args.join(' ')}`,
      };
    });

    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        runCommand,
      };
    });

    let dockerTransportModule!: DockerTransportModule;
    jest.isolateModules(() => {
      dockerTransportModule = require('../../scripts/lib/node/docker-transport.cjs') as DockerTransportModule;
    });

    const transport = dockerTransportModule.resolveDockerTransport(projectRoot, {
      requireCompose: true,
    });

    expect(transport).toMatchObject({
      kind: 'native',
    });
    expect(dockerTransportModule.formatDockerTransport(transport)).toContain('docker compose');

    const result = dockerTransportModule.runCompose(
      projectRoot,
      transport,
      envFile,
      ['ps', 'postgres', 'redis'],
      { timeout: 30000 },
    );

    expect(result.stdout).toContain('openchat-test-postgres');
    expect(runCommand).not.toHaveBeenCalledWith(
      'wsl',
      expect.any(Array),
      expect.any(Object),
    );
  });

  test('falls back to wsl docker compose when native docker engine times out on windows', () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });
    process.env.OPENCHAT_WSL_DOCKER_DISTRO = 'Ubuntu-22.04';

    const projectRoot = 'D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\openchat';
    const envFile = `${projectRoot}\\.env.test`;
    const runCommand = jest.fn((command: string, args: string[], options?: { timeout?: number }) => {
      if (command === 'docker' && args.join(' ') === 'version') {
        return {
          status: null,
          stdout: '',
          stderr: '',
          error: {
            code: 'ETIMEDOUT',
            message: 'docker version timed out',
          },
        };
      }

      if (command === 'wsl' && args.join(' ') === '-l -q') {
        return {
          status: 0,
          stdout: 'docker-desktop\nUbuntu-22.04\n',
          stderr: '',
        };
      }

      const shellScript = String(args[args.length - 1] || '');
      if (
        command === 'wsl'
        && shellScript.includes('docker version >/dev/null 2>&1')
      ) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (
        command === 'wsl'
        && shellScript.includes('docker compose version >/dev/null 2>&1')
      ) {
        return {
          status: 0,
          stdout: '',
          stderr: '',
        };
      }

      if (
        command === 'wsl'
        && shellScript.includes('docker')
        && shellScript.includes('compose')
        && shellScript.includes('ps')
      ) {
        expect(options?.timeout).toBe(30000);
        expect(shellScript).toContain("cd '/mnt/d/javasource/spring-ai-plus/spring-ai-plus-business/apps/openchat'");
        expect(shellScript).toContain("'/mnt/d/javasource/spring-ai-plus/spring-ai-plus-business/apps/openchat/.env.test'");
        return {
          status: 0,
          stdout: 'NAME                        STATUS\nopenchat-test-postgres      running\n',
          stderr: '',
        };
      }

      return {
        status: 1,
        stdout: '',
        stderr: `unexpected command: ${command} ${args.join(' ')}`,
      };
    });

    jest.doMock('../../scripts/lib/node/shared.cjs', () => {
      const actual = jest.requireActual('../../scripts/lib/node/shared.cjs');
      return {
        ...actual,
        runCommand,
      };
    });

    let dockerTransportModule!: DockerTransportModule;
    jest.isolateModules(() => {
      dockerTransportModule = require('../../scripts/lib/node/docker-transport.cjs') as DockerTransportModule;
    });

    const transport = dockerTransportModule.resolveDockerTransport(projectRoot, {
      requireCompose: true,
    });

    expect(transport).toMatchObject({
      kind: 'wsl',
      distro: 'Ubuntu-22.04',
      user: 'root',
    });
    expect(dockerTransportModule.formatDockerTransport(transport)).toContain('Ubuntu-22.04');

    const result = dockerTransportModule.runCompose(
      projectRoot,
      transport,
      envFile,
      ['ps', 'postgres', 'redis'],
      { timeout: 30000 },
    );

    expect(result.stdout).toContain('openchat-test-postgres');
    expect(runCommand).toHaveBeenCalledWith(
      'docker',
      ['version'],
      expect.objectContaining({
        cwd: projectRoot,
        timeout: 15000,
      }),
    );
    expect(runCommand).toHaveBeenCalledWith(
      'wsl',
      ['-l', '-q'],
      expect.objectContaining({
        cwd: projectRoot,
        timeout: 15000,
      }),
    );
  });
});
