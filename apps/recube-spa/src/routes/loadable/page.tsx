import { useState } from 'react';
import { loadable } from 'recube';
import { cube } from 'recube/react';

const LoadableContent = cube(() => {
  const [result, setResult] = useState<Promise<{ id: number }>>();
  const load = () => {
    setResult(
      fetch('https://jsonplaceholder.typicode.com/todos/1').then(x => x.json()),
    );
  };
  const { loading, data } = loadable(result);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <button onClick={load}>Load</button>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </>
  );
});

const LoadablePage = () => {
  return (
    <div className="container-box">
      <main>
        <h1>Loadable</h1>
        <LoadableContent />
      </main>
    </div>
  );
};

export default LoadablePage;
