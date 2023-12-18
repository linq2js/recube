import { PropsWithChildren } from 'react';
import { uniqueId } from '@/util';

export const Box = (props: PropsWithChildren<{ flash?: boolean }>) => {
  return (
    <div
      key={props.flash ? uniqueId() : undefined}
      className="flash"
      style={{ border: '1px solid black', padding: '1rem' }}
    >
      {props.children}
    </div>
  );
};
