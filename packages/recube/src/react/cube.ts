import { ReactElement, useEffect, useRef } from 'react';
import { changeWatcher } from '../changeWatcher';
import { NOOP } from '..';
import { useRerender } from './useRerender';
import { stable } from './stable';

export const cube = <P extends Record<string, any>>(
  render: (props: P) => ReactElement,
) => {
  return stable<P>(props => {
    const unwatchRef = useRef(NOOP);
    const rerender = useRerender();
    let rendering = true;
    const [{ watch }, result] = changeWatcher.wrap(() => render(props));

    let hasChangeDuringRendering = false;
    unwatchRef.current = watch(() => {
      if (rendering && !hasChangeDuringRendering) {
        hasChangeDuringRendering = true;
        return;
      }
      rerender();
    });

    useEffect(() => {
      rendering = false;
      if (hasChangeDuringRendering) {
        unwatchRef.current();
        rerender();
        return NOOP;
      }

      return watch(() => {
        unwatchRef.current();
      });
    });

    return result;
  });
};
