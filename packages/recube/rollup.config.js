import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const plugins = [typescript(), resolve(), commonjs()];

export default [
  {
    input: ['src/index.ts'],
    output: { file: 'dist/bundle.js' },
    plugins,
  },
  {
    input: ['src/react/index.ts'],
    output: { file: 'dist/react/bundle.js' },
    plugins,
  },
];
