import { isPromiseLike } from './utils';
import { AnyFunc, Dictionary } from './types';

export type ScopeEvents = 'onExit' | 'onEnter';

export type ScopeDef<T> = {
  readonly type: 'scope';
  /**
   * get current scope instance
   */
  (): Omit<T, ScopeEvents> | undefined;

  /**
   * execute a function with new scope instance of this definition or give scope snapshot
   */
  <R>(fn: () => R, snapshot?: T | ScopeSnapshot): [T, R];

  /**
   * create new scope instance
   * @returns
   */
  new: () => Omit<T, ScopeEvents>;
};

export type ScopeSnapshot = {
  readonly type: 'snapshot';

  /**
   * get scope instance of single scope definition
   */
  <T>(scope: ScopeDef<T>): T;

  <T extends Promise<any>>(promise: T): T;

  /**
   * wrap fn with snapshot
   */
  <F extends AnyFunc>(fn: F, ...args: Parameters<F>): ReturnType<F>;
};

/**
 * get snapshot
 */
export type GetSnapshot = () => ScopeSnapshot;

/**
 * create a scope
 */
export type CreateScopeDef = <T extends Dictionary>(
  create: () => T,
) => ScopeDef<T>;

/**
 * use scope with specified fn
 */
export type UseScope = <T extends Dictionary<ScopeDef<any>>, R>(
  defs: T,
  fn: () => R,
) => [{ [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never }, R];

export type Scope = {
  /**
   * get current snapshot
   */
  (): ScopeSnapshot;

  /**
   * create scope definition
   */
  <T extends Dictionary>(create: () => T): ScopeDef<T>;

  /**
   * wrap promise methods with current scope
   */
  <T extends Promise<any>>(promise: T): T;

  /**
   * apply scopes
   */
  <T extends Dictionary<ScopeDef<any>>, R>(defs: T, fn: () => R): [
    { [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never },
    R,
  ];
};

/**
 * Storing the active scopes as stack. The structure is as follows, the active is the first:
 * ```
 * [0] WeakMap(disposable)
 * [1] WeakMap(trackable)
 * [2] WeakMap(disposable)
 * ...other items
 * ```
 *
 * If we want to find the active scope of `disposable` type, the `disposable` scope located within the first item (item zero) will be found.
 */
let activeScopeStack: WeakMap<any, ScopeDef<any>>[] = [];
const SCOPE_SNAPSHOT_PROP = Symbol('scopeSnapshot');
const SCOPE_STACK_PROP = Symbol('scopeStack');

const find = (key: any, stack: WeakMap<any, any>[]) => {
  for (const item of stack) {
    const value = item.get(key);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const createScope = (create: AnyFunc) => {
  let accessor: AnyFunc;

  const get = () => {
    return find(accessor, activeScopeStack);
  };

  accessor = (...args: any[]) => {
    if (!args.length) {
      return get();
    }
    const [fn, snapshot] = args;
    const customScope =
      typeof snapshot === 'function' ? snapshot(accessor) : snapshot;
    const scopeInstance = customScope ?? create();

    return [
      scopeInstance,
      applyScopes(new Map([[accessor, scopeInstance]]), fn),
    ];
  };

  return Object.assign(accessor, { type: 'scope', new: create }) as any;
};

/**
 * @param mapOrStack A map of current scopes; we use a Map instead of a WeakMap because we need to access scope instances for emitting scope events
 * @param fn
 * @returns
 */
const applyScopes = <T>(
  mapOrStack: Map<any, any> | WeakMap<any, any>[],
  fn: () => T,
): T => {
  const prevStack = activeScopeStack;

  if (Array.isArray(mapOrStack)) {
    activeScopeStack = mapOrStack;
  } else {
    activeScopeStack = [new WeakMap(mapOrStack), ...activeScopeStack];
  }

  try {
    if ('get' in mapOrStack) {
      mapOrStack.forEach(x => {
        if (typeof x?.onEnter === 'function') {
          x.onEnter();
        }
      });
    }

    return fn();
  } finally {
    // restore active stack
    activeScopeStack = prevStack;

    if ('get' in mapOrStack) {
      mapOrStack.forEach(x => {
        if (typeof x?.onExit === 'function') {
          x.onExit();
        }
      });
      mapOrStack.clear();
    }
  }
};

const createSnapshot = () => {
  let snapshot = (activeScopeStack as any)[
    SCOPE_SNAPSHOT_PROP
  ] as ScopeSnapshot;
  if (!snapshot) {
    const snapshotStack = activeScopeStack;
    const wrap =
      (fn: AnyFunc) =>
      (...args: any[]) => {
        const prevStack = activeScopeStack;
        try {
          activeScopeStack = snapshotStack;
          return fn(...args);
        } finally {
          activeScopeStack = prevStack;
        }
      };

    snapshot = Object.assign(
      (value: any, ...args: any[]) => {
        // snapshot(def)
        // snapshot(fn)
        if (typeof value === 'function') {
          // snapshot(def)
          if (value.type === 'scope') {
            return find(value, snapshotStack);
          }

          // snapshot(fn)
          return wrap(value)(...args);
        }

        if (isPromiseLike(value)) {
          return wrapPromise(snapshot, value);
        }

        throw new Error(`No overload with ${typeof value}`);
      },
      { type: 'snapshot' as const },
    );
  }
  (activeScopeStack as any)[SCOPE_SNAPSHOT_PROP] = snapshot;

  return snapshot;
};

const wrapPromise = <T extends Promise<any>>(
  snapshot: ScopeSnapshot,
  promise: T,
): T => {
  // same scope
  if ((promise as any)[SCOPE_STACK_PROP] === snapshot) {
    return promise;
  }

  const methods = {
    finally: promise.finally?.bind(promise),
    then: promise.then?.bind(promise),
    catch: promise.catch?.bind(promise),
  };
  const wrap = (fn?: AnyFunc) => {
    if (!fn) {
      return undefined;
    }
    return (...args: any[]) => {
      return snapshot(() => fn(...args));
    };
  };
  return Object.assign(promise, {
    [SCOPE_STACK_PROP]: snapshot,
    then(...args: any[]) {
      return wrapPromise(snapshot, methods.then(wrap(args[0]), wrap(args[1])));
    },
    catch: methods.catch
      ? (...args: any[]) => {
          return wrapPromise(snapshot, methods.catch(wrap(args[0])));
        }
      : undefined,
    finally: methods.finally
      ? (...args: any[]) => {
          return wrapPromise(snapshot, methods.finally(wrap(args[0])));
        }
      : undefined,
  });
};

export const scope: Scope = (...args: any[]): any => {
  // OVERLOAD: scope()
  if (!args.length) {
    return createSnapshot();
  }

  // OVERLOAD: scope(create)
  if (args.length === 1) {
    if (typeof args[0] === 'function') {
      return createScope(args[0]);
    }
    return createSnapshot()(args[0]);
  }

  // OVERLOAD: scope(snapshot, fn)
  if (typeof args[0] === 'function' && typeof args[1] === 'function') {
    const [snapshot, fn] = args as [ScopeSnapshot, AnyFunc];
    return snapshot(fn);
  }

  // OVERLOAD: scope(defs, fn)
  const [scopeTypes, fn] = args as [Record<string, ScopeDef<any>>, AnyFunc];
  const scopes: Dictionary = {};
  const scopeMap = new Map();
  Object.keys(scopeTypes).forEach(key => {
    const scopeType = scopeTypes[key];
    const scopeInstance = scopeType.new();
    scopes[key] = scopeInstance;
    scopeMap.set(scopeType, scopeInstance);
  });

  return [scopes, applyScopes(scopeMap, fn)];
};
