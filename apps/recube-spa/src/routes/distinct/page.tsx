import { useEffect } from 'react';
import { equal, action, state } from 'recube';
import { cube } from 'recube/react';

const incrementOnChange = action<number>();
const fastForward = action();
const mediaPlayerInfo = state({ position: 0 }, { equal })
  .when(incrementOnChange, (_, position) => ({ position }))
  .when(fastForward, prev => ({ position: prev.position + 1 }));

const useMediaPlayerInfo = () => {
  return mediaPlayerInfo();
};

const MediaPlayer = cube(() => {
  const info = useMediaPlayerInfo();

  useEffect(() => {
    incrementOnChange(info.position);
  }, [info]);

  return <h2>{JSON.stringify(mediaPlayerInfo())}</h2>;
});

const Seek = cube(() => {
  return (
    <>
      <button onClick={() => fastForward()}>Fast Forward</button>
    </>
  );
});

const SearchPage = () => (
  <div className="container-box">
    <main>
      <h1>Distinct</h1>
      <MediaPlayer />
      <Seek />
    </main>
  </div>
);

export default SearchPage;
