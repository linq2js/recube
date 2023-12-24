'use client';

import { useEffect, useState } from 'react';

const log = (...args: any[]) => {
  console.log({ isClient: typeof window !== 'undefined' }, ...args);
};

export const Log = () => {
  const [value1, setValue1] = useState(false);
  const [value2] = useState(() => Math.random());

  log('render');
  log({ value1, value2 });

  useEffect(() => {
    log('mount');
    setValue1(true);
    return () => {
      log('unmount');
    };
  }, []);

  return <div></div>;
};

export const LogWrapper = () => {
  const [showLog, setShowLog] = useState(true);

  return (
    <>
      <button onClick={() => setShowLog(!showLog)}>Toggle Log</button>
      {showLog && <Log />}
    </>
  );
};
