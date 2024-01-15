import { signal, batch, Signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect } from 'react';

const startTime = Date.now();
const duration = 30000;
const numElements = 100;

const colorMap = new Map<number, Signal<string>>();
const colors = (key: number) => {
  let color = colorMap.get(key);
  if (!color) {
    color = signal('');
    colorMap.set(key, color);
  }
  return color;
};
const numColorUpdates = signal(0);
const secondsRunning = signal(0);
const updateInfo = () => {
  numColorUpdates.value++;
  secondsRunning.value = (Date.now() - startTime) / 1000;
};

const Cell = ({ n }: { n: number }) => {
  useSignals();
  const backgroundColor = colors(n).value;

  return (
    <div
      style={{
        width: 50,
        height: 50,
        textAlign: 'center',
        float: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: backgroundColor === '#ffffff' ? 'black' : 'white',
        backgroundColor,
      }}
    >
      {n}
    </div>
  );
};

const Matrix = () => {
  return (
    <div style={{ width: 500 }}>
      {new Array(numElements).fill(null).map((_, n) => (
        <Cell key={n} n={n} />
      ))}
    </div>
  );
};

const Info = () => {
  useSignals();

  return (
    <>
      <h1 style={{ fontWeight: 100 }}>{secondsRunning.value}</h1>
      <div>{numColorUpdates.value} colors</div>
      <div>
        {Math.floor(numColorUpdates.value / secondsRunning.value)} colors per
        second
      </div>
    </>
  );
};

function setColor(n: number) {
  batch(() => {
    colors(n).value = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    updateInfo();
  });
  if (Date.now() - startTime >= duration) {
    return;
  }
  setTimeout(() => setColor(n), 0);
}

const PerformancePage = () => {
  useEffect(() => {
    setTimeout(() => {
      for (let n = 0; n < numElements; n++) {
        setColor(n);
      }
    });
  }, []);

  return (
    <div className="container-box">
      <main>
        <div>
          <h1>PREACT/SIGNALS</h1>
          <a
            href="https://codesandbox.io/s/redux-performance-hbit7?file=/src/App.js"
            target="_blank"
          >
            Checkout Redux implementation
          </a>
          <div>
            <Info />
            <Matrix />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerformancePage;
