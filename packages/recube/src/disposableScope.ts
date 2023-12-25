import { scope } from './scope';

export const disposableScope = scope(() => {
  const disposes = new Set<VoidFunction>();

  return {
    dispose() {
      disposes.forEach(x => x());
      disposes.clear();
    },
    onDispose(dispose: VoidFunction) {
      disposes.add(dispose);
    },
  };
});
