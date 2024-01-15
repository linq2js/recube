import { ObservablePrimitiveBaseFns, observable } from '@legendapp/state';
import { observer } from '@legendapp/state/react';
import { useEffect } from 'react';

const startTime = Date.now();
const duration = 30000;
const numElements = 100;

const colorMap = new Map<number, ObservablePrimitiveBaseFns<string>>();
const colors = (key: number) => {
  let color = colorMap.get(key);
  if (!color) {
    color = observable('');
    colorMap.set(key, color);
  }
  return color;
};
const numColorUpdates = observable(0);
const secondsRunning = observable(0);
const updateInfo = () => {
  numColorUpdates.set(prev => prev + 1);
  secondsRunning.set((Date.now() - startTime) / 1000);
};

const Cell = observer(({ n }: { n: number }) => {
  const backgroundColor = colors(n).get();

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
});

const Matrix = () => {
  return (
    <div style={{ width: 500 }}>
      {new Array(numElements).fill(null).map((_, n) => (
        <Cell key={n} n={n} />
      ))}
    </div>
  );
};

const Info = observer(() => {
  return (
    <>
      <h1 style={{ fontWeight: 100 }}>{secondsRunning.get()}</h1>
      <div>{numColorUpdates.get()} colors</div>
      <div>
        {Math.floor(numColorUpdates.get() / secondsRunning.get())} colors per
        second
      </div>
    </>
  );
});

function setColor(n: number) {
  colors(n).set(`#${Math.floor(Math.random() * 16777215).toString(16)}`);
  updateInfo();
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
          <h1>LEGENDAPP/STATE</h1>
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
