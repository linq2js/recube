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
  <R>(fn: () => R, scope?: T): [T, R];

  /**
   * execute a function with new scope instance of this definition or give scope snapshot
   */
  <R>(fn: () => R, snapshot: ScopeSnapshot): [T, R];

  /**
   * execute a function with new scope instance of this definition or give scope snapshot
   */
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  <R>(fn: () => R, modifier: (scope: T) => void): [T, R];

  /**
   * create new scope instance
   * @returns
   */
  new: () => Omit<T, ScopeEvents>;
};

export type ScopeSnapshot = {
  readonly type: 'snapshot';

  readonly stack: WeakMap<ScopeDef<any>, any>[];

  /**
   * get scope instance of single scope definition
   */
  <T>(scope: ScopeDef<T>): T;

  <T extends Promise<any>>(promise: T): T;

  /**
   * wrap fn with snapshot
   */
  <F extends AnyFunc>(fn: F, ...args: Parameters<F>): ReturnType<F>;

  /**
   * call a function with specified scopes
   */
  <T>(scopes: Map<any, any>, fn: () => T): T;
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
  <T extends Dictionary<ScopeDef<any>>, R>(
    defs: T,
    fn: () => R,
    modifier?: (scopes: {
      [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never;
    }) => void,
  ): [{ [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never }, R];
};

let currentSnapshot: ScopeSnapshot;
const SNAPSHOT_PROP = Symbol('snapshot');

const createScope = (create: AnyFunc) => {
  let accessor: AnyFunc;

  const get = () => {
    return currentSnapshot(accessor);
  };

  accessor = (...args: any[]) => {
    if (!args.length) {
      return get();
    }
    const [fn, snapshot] = args;
    let scopeInstance: any;
    let scopeModifier: AnyFunc | undefined;

    if (typeof snapshot === 'function') {
      if (snapshot.type === 'snapshot') {
        scopeInstance = snapshot(accessor);
      } else {
        scopeInstance = create();
        scopeModifier = snapshot;
      }
    } else {
      scopeInstance = snapshot ?? create();
    }

    scopeModifier?.(scopeInstance);

    return [
      scopeInstance,
      currentSnapshot(new Map([[accessor, scopeInstance]]), fn),
    ];
  };

  return Object.assign(accessor, { type: 'scope', new: create }) as any;
};

/**
 * @param stack Storing the active scopes as stack. The structure is as follows, the active is the first:
 * ```
 * [0] WeakMap(disposable)
 * [1] WeakMap(trackable)
 * [2] WeakMap(disposable)
 * ...other items
 * ```
 *
 * If we want to find the active scope of `disposable` type, the `disposable` scope located within the first item (item zero) will be found.
 */
const createSnapshot = (stack: WeakMap<ScopeDef<any>, any>[] = []) => {
  const wrapFunction = (fn: AnyFunc) => {
    return (...args: any[]) => {
      const prevSnapshot = currentSnapshot;
      try {
        currentSnapshot = snapshot;
        return fn(...args);
      } finally {
        currentSnapshot = prevSnapshot;
      }
    };
  };

  const wrapPromise = <T extends Promise<any>>(promise: T): T => {
    // same scope
    if ((promise as any)[SNAPSHOT_PROP] === snapshot) {
      return promise;
    }

    const methods = {
      finally: promise.finally?.bind(promise),
      then: promise.then?.bind(promise),
      catch: promise.catch?.bind(promise),
    };

    return Object.assign(promise, {
      [SNAPSHOT_PROP]: snapshot,
      then(onResolve?: AnyFunc, onReject?: AnyFunc) {
        return wrapPromise(
          methods.then(
            onResolve && wrapFunction(onResolve),
            onReject && wrapFunction(onReject),
          ),
        );
      },
      catch: methods.catch
        ? (onCatch?: AnyFunc) => {
            return wrapPromise(methods.catch(onCatch && wrapFunction(onCatch)));
          }
        : undefined,
      finally: methods.finally
        ? (onFinally?: AnyFunc) => {
            return wrapPromise(
              methods.finally(onFinally && wrapFunction(onFinally)),
            );
          }
        : undefined,
    });
  };

  const applyScopes = <T>(scopes: Map<any, any>, fn: () => T): T => {
    const prevSnapshot = currentSnapshot;

    currentSnapshot = createSnapshot([new WeakMap(scopes)].concat(stack));

    try {
      if ('get' in scopes) {
        scopes.forEach(x => {
          if (typeof x?.onEnter === 'function') {
            x.onEnter();
          }
        });
      }

      return fn();
    } finally {
      // restore active stack
      currentSnapshot = prevSnapshot;

      if ('get' in scopes) {
        scopes.forEach(x => {
          if (typeof x?.onExit === 'function') {
            x.onExit();
          }
        });
        scopes.clear();
      }
    }
  };

  const findScope = (def: ScopeDef<any>) => {
    for (const item of stack) {
      const value = item.get(def);
      if (value) {
        return value;
      }
    }
    return undefined;
  };

  const snapshot = Object.assign(
    (...args: any[]) => {
      const value = args[0];
      // OVERLOAD: snapshot(def)
      // OVERLOAD: snapshot(fn)
      if (typeof value === 'function') {
        // OVERLOAD: snapshot(def)
        if (value.type === 'scope') {
          return findScope(value);
        }

        // OVERLOAD: snapshot(fn)
        return wrapFunction(value)(...args.slice(1));
      }

      if (isPromiseLike(value)) {
        return wrapPromise(value);
      }

      if (value instanceof Map && typeof args[1] === 'function') {
        return applyScopes(value, args[1]);
      }

      throw new Error(`No overload with ${typeof value}`);
    },
    { type: 'snapshot' as const, stack },
  );

  return snapshot;
};

export const scope: Scope = (...args: any[]): any => {
  // OVERLOAD: scope()
  if (!args.length) {
    return currentSnapshot;
  }

  // OVERLOAD: scope(create)
  // OVERLOAD: scope(promise)
  if (args.length === 1) {
    if (typeof args[0] === 'function') {
      return createScope(args[0]);
    }

    return currentSnapshot(args[0]);
  }

  // OVERLOAD: scope(snapshot, fn)
  if (typeof args[0] === 'function' && typeof args[1] === 'function') {
    const [snapshot, fn] = args as [ScopeSnapshot, AnyFunc];
    return snapshot(fn);
  }

  // OVERLOAD: scope(defs, fn)
  const [scopeTypes, fn, modifier] = args as [
    Record<string, ScopeDef<any>>,
    AnyFunc,
    AnyFunc | undefined,
  ];
  const scopes: Dictionary = {};
  const scopeMap = new Map();
  Object.keys(scopeTypes).forEach(key => {
    const scopeType = scopeTypes[key];
    const scopeInstance = scopeType.new();
    scopes[key] = scopeInstance;
    scopeMap.set(scopeType, scopeInstance);
  });
  modifier?.(scopes);
  return [scopes, currentSnapshot(scopeMap, fn)];
};

currentSnapshot = createSnapshot();
