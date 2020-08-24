import createArrayKeyedMap from "./createArrayKeyedMap";

export default function cacheModule() {
  return Object.assign((factory) => {
    const members = createArrayKeyedMap();
    return Object.assign((...args) => members.getOrAdd(args, factory), {
      clear: members.clear,
      delete(...args) {
        return members.delete(args);
      }
    });
  }, {});
}
