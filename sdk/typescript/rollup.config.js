import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

const pkg = {
  name: '@openchat/typescript-sdk',
  description: 'OpenChat TypeScript SDK - 高内聚低耦合的即时通讯SDK，基于悟空IM EasySDK，支持多平台、多RTC Provider',
  version: '1.0.0',
  author: 'OpenChat Team',
  license: 'MIT',
  repository: { url: 'https://github.com/openchat-team/openchat-typescript-sdk.git' }
};

const banner = `/**
 * ${pkg.name}
 * ${pkg.description}
 * 
 * @version ${pkg.version}
 * @author ${pkg.author}
 * @license ${pkg.license}
 * @repository ${pkg.repository.url}
 */`;

const input = 'src/index.ts';
const external = ['eventemitter3'];

const config = [
  {
    input,
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
      banner,
      exports: 'named',
    },
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external,
  },
  {
    input,
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      banner,
      exports: 'named',
      interop: 'auto',
    },
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
    external,
  },
  {
    input,
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
      banner,
    },
    plugins: [
      dts({
        respectExternal: true,
      }),
    ],
    external,
  },
];

export default config;
