import createArrayKeyedMap from "../createArrayKeyedMap";

const defaultMemberCreator = () => ({});

export default function ({ use }) {
  const family = use(familyModule);
  return {
    name: "cache",
    impl: {
      family,
    },
  };
}

export function familyModule({}) {
  return function (memberCreator = defaultMemberCreator) {
    const map = createArrayKeyedMap();
    return Object.assign(
      function (...args) {
        return map.getOrAdd(args, () => memberCreator(...args));
      },
      {
        clear: map.clear,
        delete(...args) {
          return map.delete(args, (value) => {
            if (value && typeof value.dispose === "function") {
              value.dispose();
            }
          });
        },
      }
    );
  };
}
