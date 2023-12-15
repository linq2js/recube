import { scope } from './scope';

const SIGNAL_PROP = Symbol('signal');

const onAbort = (signal: AbortSignal, listener: (reason: any) => void) => {
  const wrapper = () => listener(signal.reason);
  let active = true;
  signal.addEventListener('abort', wrapper);

  return () => {
    if (!active) {
      return;
    }
    active = false;
    signal.removeEventListener('abort', wrapper);
  };
};

const create = (...otherControllers: { [SIGNAL_PROP]: AbortSignal }[]) => {
  const ac = new AbortController();
  const unsubscribe: VoidFunction[] = [];

  const abortWrapper = (reason: any = 'Aborted without any reason') => {
    if (ac.signal.aborted) {
      return;
    }
    ac.abort(reason);
    unsubscribe.splice(-unsubscribe.length).forEach(x => x());
  };

  otherControllers.forEach(x => {
    unsubscribe.push(onAbort(x[SIGNAL_PROP], abortWrapper));
  });

  return {
    [SIGNAL_PROP]: ac.signal,
    get aborted() {
      return ac.signal.aborted;
    },
    get reason() {
      return ac.signal.reason;
    },
    abort: abortWrapper,
    onAbort(listener: (reason: any) => void) {
      return onAbort(ac.signal, listener);
    },
    throwIfAborted() {
      if (ac.signal.aborted) {
        throw new Error(ac.signal.reason);
      }
      ac.signal.throwIfAborted();
    },
  };
};

export const abortController = Object.assign(scope(create), {
  create() {
    return create();
  },
  any(...controllers: ReturnType<typeof create>[]) {
    return create(...controllers);
  },
  timeout(ms: number) {
    const ac = create();
    setTimeout(ac.abort, ms, 'Timeout');
    return ac;
  },
});
