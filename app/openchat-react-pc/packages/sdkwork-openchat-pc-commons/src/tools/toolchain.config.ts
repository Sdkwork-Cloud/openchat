export interface ToolchainConfig {
  codeGenerator: {
    defaultComponentOptions: {
      type: 'functional' | 'class';
      withProps: boolean;
      withState: boolean;
      withEffects: boolean;
      withStyles: boolean;
      withTests: boolean;
    };
    defaultServiceOptions: {
      withInterface: boolean;
      withImplementation: boolean;
      withTests: boolean;
    };
  };
  linting: {
    enabled: boolean;
    extensions: string[];
    ignorePaths: string[];
  };
  formatting: {
    enabled: boolean;
    extensions: string[];
    ignorePaths: string[];
  };
  testing: {
    enabled: boolean;
    extensions: string[];
    ignorePaths: string[];
  };
  build: {
    enabled: boolean;
    minify: boolean;
    sourceMap: boolean;
  };
}

export const toolchainConfig: ToolchainConfig = {
  codeGenerator: {
    defaultComponentOptions: {
      type: 'functional',
      withProps: true,
      withState: true,
      withEffects: true,
      withStyles: true,
      withTests: true
    },
    defaultServiceOptions: {
      withInterface: true,
      withImplementation: true,
      withTests: true
    }
  },
  linting: {
    enabled: true,
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    ignorePaths: ['node_modules', 'dist', 'build', 'coverage']
  },
  formatting: {
    enabled: true,
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'],
    ignorePaths: ['node_modules', 'dist', 'build', 'coverage']
  },
  testing: {
    enabled: true,
    extensions: ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'],
    ignorePaths: ['node_modules', 'dist', 'build', 'coverage']
  },
  build: {
    enabled: true,
    minify: true,
    sourceMap: true
  }
};

export default toolchainConfig;
