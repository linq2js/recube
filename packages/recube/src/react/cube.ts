import { ReactElement, useEffect, useRef } from 'react';
import { trackable } from '../trackable';
import { stable } from './stable';
import { useRerender } from './useRerender';

export const cube = <P extends Record<string, any>>(
  render: (props: P) => ReactElement,
) => {
  return stable<P>(props => {
    const renrender = useRerender();
    //  should use track manually because render function might contain React hooks
    const [{ track }, result] = trackable(() => render(props));
    const untrackRef = useRef<VoidFunction>();

    untrackRef.current = track(() => renrender());

    useEffect(() => {
      if (!untrackRef.current) {
        renrender();
      }

      return () => {
        untrackRef.current?.();
        untrackRef.current = undefined;
      };
    }, [renrender]);

    return result;
  });
};
