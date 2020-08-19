import storeact from "../../index";
import useApi from "./useApi";
import useLogger from "./useLogger";

export default function () {
  // storeact() without any argument returns store context object
  const { async } = storeact();
  // we can use any store hook, store hook is just a function that returns utilities
  const { info, entries } = useLogger(10);
  const { api } = useApi(info);
  // define local variables to hold store state
  let albumId = undefined;
  // create some AsyncValue objects to hold dynamic async data
  const albumList = async.value([]);
  const albumInfo = async.value({});
  const photoList = async.value([]);

  return {
    // a state function returns current store state
    state() {
      return {
        logs: entries(),
        albumId,
        // to use Suspense component, we returns promise of AsyncValue
        albumList: albumList,
        albumInfo: albumInfo,
        photoList: photoList,
      };
    },
    // flow is used to define action dispatching order
    flow: {
      // init action should dispatch first
      init: {
        $block: false,
        $success: {
          // other actions can dispatch after init action is successfully
          selectAlbum: {},
          reloadAlbum: {},
        },
        // loadAlbum can dispatch during init action execution
        loadAlbum: {
          // when loadAlbumn dispatched, we dont want to block its execution flow
          // we allows user to dispatch cancelLoading action
          $block: false,
          cancelLoading: {},
        },
      },
    },
    init() {
      const savedState = JSON.parse(localStorage.getItem("appData")) || {};
      const promises = [];

      albumId = savedState.albumId;

      promises.push(albumList.promise);

      // AsyncValue object has load() method
      // it handles async data loading automatically
      // Store will re-update when promise status has been changed
      albumList.load(
        api(`albums`)
          // get top 10
          .then((res) => res.slice(0, 10))
      );

      if (albumId) {
        promises.push(this.loadAlbum(albumId));
      }

      return Promise.all(promises);
    },
    // state persistence logic
    onChange() {
      localStorage.setItem("appData", JSON.stringify({ albumId }));
    },
    selectAlbum(id) {
      if (albumId === id) return;
      albumId = id;
      this.loadAlbum(id);
    },
    loadAlbum(id) {
      // data loading progress will be cancelled if cancelLoading or loadAlbum action dispatched
      const cancellable = async.cancellable(this.cancelLoading, this.loadAlbum);
      albumInfo.load(api(`albums/${id}`), cancellable);
      photoList.load(
        // we delay data fetching to 3000 to show loading indicator
        // and user has enough time to click cancel button
        api(`photos`).then((res) =>
          res.filter((photo) => photo.albumId === id)
        ),
        cancellable
      );

      return Promise.all([albumInfo.promise, photoList.promise]);
    },
    cancelLoading() {},
    reloadAlbum() {
      this.loadAlbum(albumId);
    },
  };
}
