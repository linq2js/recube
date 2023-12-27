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

  /**
   * get scope instances of multiple scope definitions
   */
  <T extends ScopeDef<any>[] | Dictionary<ScopeDef<any>>>(scopes: T): {
    [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never;
  };
};

export type Scope = {
  /**
   * get snapshot of all scope instances
   */
  (): ScopeSnapshot;

  /**
   * create a scope definition
   */
  <T extends Dictionary>(create: () => T): ScopeDef<T>;

  /**
   * execute a function with scope instances that are created from specified scope definitions
   */
  <T extends Dictionary<ScopeDef<any>>, R>(defs: T, fn: () => R): [
    { [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never },
    R,
  ];
};

const activeScopes = new Map();

const createScope = (create: AnyFunc) => {
  let accessor: AnyFunc;

  const get = () => {
    return activeScopes.get(accessor);
  };

  accessor = (...args: any[]) => {
    if (!args.length) {
      return get();
    }
    const [fn, snapshot] = args;
    const customScope =
      typeof snapshot === 'function' ? snapshot(accessor) : snapshot;
    const current = customScope ?? create();
    const { onEnter, onExit } = current ?? {};
    const prev = get();
    activeScopes.set(accessor, current);
    try {
      if (typeof onEnter === 'function') {
        onEnter();
      }
      return [current, fn()] as const;
    } finally {
      activeScopes.set(accessor, prev);
      if (typeof onExit === 'function') {
        onExit();
      }
    }
  };

  return Object.assign(accessor, { type: 'scope', new: create }) as any;
};

export const scope: Scope = (...args: any[]): any => {
  if (!args.length) {
    const snapshot = new Map(activeScopes);
    return Object.assign(
      (type: any) => {
        if (!type) {
          throw new Error('Invalid scope definition');
        }
        // is ScopeDef
        if (typeof type === 'function') {
          return snapshot.get(type);
        }
        if (Array.isArray(type)) {
          return type.map(x => snapshot.get(x));
        }
        const obj: Dictionary = {};
        Object.keys(type).forEach(key => {
          obj[key] = snapshot.get(key);
        });
        return obj;
      },
      { type: 'snapshot' },
    );
  }

  if (args.length === 1) {
    return createScope(args[0]);
  }

  const [scopeTypes, fn] = args as [Record<string, AnyFunc>, AnyFunc];
  const scopes: Dictionary = {};
  const keys = Object.keys(scopeTypes);

  return [
    scopes,
    keys.reduceRight(
      (next, key) => () => {
        const [scope, result] = scopeTypes[key](next);
        scopes[key] = scope;
        return result;
      },
      fn,
    )(),
  ];
};
