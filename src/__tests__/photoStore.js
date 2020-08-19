import storeact from "../index";
import { renderHook } from "@testing-library/react-hooks";
import photos from "./photos.json";
import albums from "./albums.json";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

async function api(route, ms) {
  await delay(50);
  if (route.includes("photos")) return photos.slice(0);
  if (route.includes("albums")) return albums.slice(0);
}

const Store = () => {
  let albumId = undefined;
  const { async } = storeact();
  const albumList = async.value([]);
  const albumInfo = async.value({});
  const photoList = async.value([]);
  const callstack = [];

  return {
    state() {
      return {
        albumId,
        callstack,
        albumList: albumList.value,
        albumInfo: albumInfo.value,
        photoList: photoList.value,
      };
    },
    flow() {
      return {
        init: {
          selectAlbum: {},
          reloadAlbum: {},
          loadAlbum: {
            cancelLoading: {},
          },
        },
      };
    },
    init() {
      albumList.load(api(`albums`));
      return albumList.promise;
    },
    loadAlbum(id) {
      albumInfo.load(api(`albums/${id}`));
      photoList.load(api(`photos`));
      callstack.push("loadAlbum");
    },
    cancelLoading() {
      albumInfo.cancel();
      photoList.cancel();
      callstack.push("cancelLoading");
    },
    reloadAlbum() {
      this.loadAlbum(albumId);
      callstack.push("reloadAlbum");
    },
  };
};

test("", async () => {
  let photoList;
  const { result } = renderHook(() => storeact(Store));
  await delay(60);
  expect(result.current.state.albumList.length).toBeGreaterThan(0);

  photoList = result.current.state.photoList;
  result.current.loadAlbum(result.current.state.albumList[0].id);
  await delay(60);
  // new photo list loaded
  expect(photoList).not.toBe(result.current.state.photoList);

  // try load new photo list
  photoList = result.current.state.photoList;
  result.current.loadAlbum(result.current.state.albumList[1].id);
  await delay(20);
  // cancel loading before it is finished
  result.current.cancelLoading();
  // keep existing list
  expect(photoList).toBe(result.current.state.photoList);

  // try load new photo list
  photoList = result.current.state.photoList;
  result.current.loadAlbum(result.current.state.albumList[1].id);
  await delay(60);
  // new photo list loaded
  expect(photoList).not.toBe(result.current.state.photoList);
  result.current.cancelLoading();
});
