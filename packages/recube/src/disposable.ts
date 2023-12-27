import { scope } from './scope';

export const disposable = scope(() => {
  const disposes = new Set<VoidFunction>();

  return {
    dispose() {
      disposes.forEach(x => x());
      disposes.clear();
    },
    add(dispose: VoidFunction) {
      disposes.add(dispose);
    },
  };
});
