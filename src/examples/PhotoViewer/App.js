import React, { Suspense, memo } from "react";
// import "./styles.css";
import storeact from "../../index";
import PhotoStore from "./PhotoStore";

function AlbumSelector() {
  const { selectAlbum, albums, albumId } = storeact(
    PhotoStore,
    ({ state, selectAlbum, valueOf }) => ({
      selectAlbum,
      albumId: state.albumId,
      albums: valueOf(state.albumList),
    })
  );

  return (
    <p>
      <select
        onChange={(e) => selectAlbum(parseInt(e.target.value, 10))}
        value={albumId}
      >
        {typeof albumId === "undefined" && <option>Select album</option>}
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.title}
          </option>
        ))}
      </select>
    </p>
  );
}

const AlbumInfo = memo(() => {
  const { reloadAlbum, cancelLoading, album, photoList } = storeact(
    PhotoStore,
    ({ state, valueOf, loadableOf, reloadAlbum, cancelLoading }) => ({
      album: valueOf(state.albumInfo),
      // using loadableOf to retreive photoList loading status
      photoList: loadableOf(state.photoList),
      reloadAlbum,
      cancelLoading,
    })
  );
  if (!album.id) return null;

  return (
    <div>
      <h1>{album.title}</h1>
      <p>
        {photoList.state === "hasValue" && (
          <button onClick={reloadAlbum}>Reload album</button>
        )}
        {photoList.state === "loading" && (
          <button onClick={cancelLoading}>Cancel</button>
        )}
      </p>
    </div>
  );
});

const PhotoList = memo(() => {
  const photos = storeact(PhotoStore, (store) =>
    store.valueOf(store.state.photoList)
  );
  console.log(1);
  return (
    <div className="PhotoList">
      {photos.map((photo) => (
        <div key={photo.id}>
          <img src={photo.thumbnailUrl} alt={photo.title} />
          <br />
          {photo.title}
        </div>
      ))}
    </div>
  );
});

function Loading({ children }) {
  return <h4>{children}</h4>;
}

function Logs() {
  const logs = storeact(PhotoStore, (store) => store.state.logs);
  return (
    <div className="Logs">
      <h2>Log</h2>
      <ul>
        {logs.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  return (
    <div className="App">
      <Suspense fallback={<Loading>Loading album list...</Loading>}>
        <AlbumSelector />
        <Suspense fallback={<Loading>Loading album info...</Loading>}>
          <AlbumInfo />
        </Suspense>
        <Suspense
          fallback={
            <Loading>
              It takes much time for loading photo list, click cancel to stop
              loading...
            </Loading>
          }
        >
          <PhotoList />
        </Suspense>
      </Suspense>
      <Logs />
    </div>
  );
}
