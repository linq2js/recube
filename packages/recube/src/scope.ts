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

  (): WeakMap<any, any>[];

  /**
   * get scope instance of single scope definition
   */
  <T>(scope: ScopeDef<T>): T;

  /**
   * get scope instances of multiple scope definitions
   */
  <T extends ScopeDef<any>[] | Dictionary<ScopeDef<any>>>(scopes: T): {
    [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never;
  };
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

/**
 * use snapshot with specified fn
 */
export type UseSnapshot = <T>(snapshot: ScopeSnapshot, fn: () => T) => T;

export type Scope = GetSnapshot & CreateScopeDef & UseScope & UseSnapshot;

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

export const scope: Scope = (...args: any[]): any => {
  // OVERLOAD: scope()
  if (!args.length) {
    let snapshotMethods = (activeScopeStack as any)[SCOPE_SNAPSHOT_PROP];

    if (!snapshotMethods) {
      const snapshot = activeScopeStack;
      snapshotMethods = Object.assign(
        (type: any) => {
          if (!type) {
            return snapshot;
          }
          // is ScopeDef
          if (typeof type === 'function') {
            return find(type, snapshot);
          }
          if (Array.isArray(type)) {
            return type.map(x => find(x, snapshot));
          }
          const obj: Dictionary = {};
          Object.keys(type).forEach(key => {
            obj[key] = find(type[key], snapshot);
          });
          return obj;
        },
        { type: 'snapshot' },
      );
    }
    (activeScopeStack as any)[SCOPE_SNAPSHOT_PROP] = snapshotMethods;

    return snapshotMethods;
  }

  // OVERLOAD: scope(create)
  if (args.length === 1) {
    return createScope(args[0]);
  }

  // OVERLOAD: scope(snapshot, fn)
  if (typeof args[0] === 'function' && typeof args[1] === 'function') {
    const [snapshot, fn] = args as [ScopeSnapshot, AnyFunc];
    return applyScopes(snapshot(), fn);
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
