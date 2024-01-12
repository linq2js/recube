import { ReactNode, createElement, memo } from 'react';
import { AnyFunc, Equal, NoInfer } from '../types';
import { useComputed } from './useComputed';

/**
 * there are 2 characteristics of rx()
 * 1. rx(stateFn) => the Part should not re-render even its parent component re-renders because stateFn is constant
 * 2. rx(customFn) => the Part should re-render to ensure the function result is up to date
 */
const Part = memo((props: { fn: AnyFunc; equal?: Equal }) => {
  return useComputed(props.fn, props.equal);
});

export const rx = <T>(fn: () => T, equal?: Equal<NoInfer<T>>): ReactNode => {
  return createElement(Part, { fn, equal });
};
