import { emitter } from './emitter';
import { scope } from './scope';
import { Listenable, Listener } from './types';
import { NOOP } from './utils';

export type Canceler = Listenable<any> & {
  cancelled: () => boolean;
  cancel: (reason?: any) => void;
  reason: () => any;
  signal: () => AbortSignal | undefined;
  error: () => Error | undefined;
  throwIfCancelled: () => void;
  wrap: <T>(fn: () => T) => T;
};

const CANCELLED_ERROR_PROP = Symbol('CancelledError');

const createCanceler = (...listenables: Listenable<any>[]) => {
  let ac: AbortController | undefined;
  let cancelled: { reason: any } | undefined;
  let disposed = false;
  let error: Error | undefined;
  const onCancel = emitter<any>();
  const onDispose = emitter();

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    onCancel.clear();
    onDispose.emit();
    onDispose.clear();
  };

  const cancel = (reason: any = 'Cancelled without reason') => {
    if (cancelled) {
      return;
    }
    cancelled = { reason };
    ac?.abort(reason);
    onCancel.emit(reason);
    dispose();
  };

  const getError = () => {
    if (!error) {
      if (cancelled) {
        error = Object.assign(new Error(cancelled.reason), {
          [CANCELLED_ERROR_PROP]: true,
        });
      }
    }
    return error;
  };

  listenables.forEach(x => {
    onDispose.on(x.on(cancel));
  });

  const instance: Canceler = {
    cancelled() {
      return Boolean(cancelled);
    },
    error: getError,
    reason() {
      return cancelled?.reason;
    },
    signal() {
      if (!ac) {
        ac = new AbortController();
        if (cancelled) {
          ac.abort(cancelled.reason);
        }
      }
      return ac.signal;
    },
    cancel,
    on(listener: Listener<any>) {
      if (disposed) {
        return NOOP;
      }
      if (cancelled) {
        listener(cancelled.reason);
        return NOOP;
      }
      return onCancel.on(listener);
    },
    throwIfCancelled() {
      const e = getError();
      if (e) {
        ac?.signal.throwIfAborted?.();
        throw e;
      }
    },
    wrap(fn) {
      const [, result] = cancelerScope.wrap(fn, instance);
      return result;
    },
  };

  return instance;
};

const cancelerScope = scope(createCanceler);

export const canceler = Object.assign(cancelerScope, {
  new: createCanceler,
  any(...listenables: Listenable<any>[]) {
    return createCanceler(...listenables);
  },
  timeout(ms: number) {
    const ac = createCanceler();
    setTimeout(ac.cancel, ms, 'Timeout');
    return ac;
  },
  isCancelledError(value: any): value is Error {
    return value?.[CANCELLED_ERROR_PROP];
  },
});
