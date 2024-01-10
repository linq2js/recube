import { scope } from './scope';

export const stalable = scope(() => ({
  mode: 'none' as 'none' | 'error' | 'all',
}));
