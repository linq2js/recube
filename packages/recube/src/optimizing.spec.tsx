import { useRef, useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { EO } from './types';

describe('optimizing', () => {
  test('props object should be the same with previous rendering', () => {
    const log = jest.fn();
    const Comp = (props: EO) => {
      const propsRef = useRef<any>();
      const rerender = useState({})[1];

      if (propsRef.current) {
        log(propsRef.current === props);
      }

      propsRef.current = props;

      return <div onClick={() => rerender({})}>rerender</div>;
    };

    const { rerender, getByText } = render(<Comp />);

    rerender(<Comp />);
    rerender(<Comp />);

    fireEvent.click(getByText('rerender'));
    fireEvent.click(getByText('rerender'));

    expect(log.mock.calls).toEqual([[false], [false], [true], [true]]);
  });
});
