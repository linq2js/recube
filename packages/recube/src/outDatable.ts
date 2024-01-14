import { scope } from './scope';

export const outDatable = scope(() => ({
  mode: 'none' as 'none' | 'error' | 'all',
}));
