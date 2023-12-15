export const emitter = <T = void>() => {
  type Listener = (args: T) => void;
  let emitting = false;
  const listeners = new Set<Listener>();
  const queue: { type: 'add' | 'delete'; listener: Listener }[] = [];

  return {
    size() {
      return listeners.size;
    },
    emit(args: T) {
      emitting = true;
      try {
        listeners.forEach(listener => listener(args));
      } finally {
        emitting = false;
        queue.splice(-queue.length).forEach(({ type, listener }) => {
          listeners[type](listener);
        });
      }
    },
    add(listener: Listener) {
      if (emitting) {
        queue.push({ type: 'add', listener });
      } else {
        listeners.add(listener);
      }
      let active = true;
      return () => {
        if (!active) {
          return;
        }
        active = false;
        if (emitting) {
          queue.push({ type: 'delete', listener });
        } else {
          listeners.delete(listener);
        }
      };
    },
  };
};
