import asyncModule from "./modules/asyncModule";
import cacheModule from "./modules/cacheModule";
import lockModule from "./modules/lockModule";

export default function createStoreContext(api) {
  const moduleInstances = new WeakMap();

  const context = {
    ...api,
    use(module) {
      let instance = moduleInstances.get(module);
      if (!instance) {
        instance = module(context);
        if (typeof instance === "function") {
          instance = { impl: instance };
        }
        if (instance.name) {
          const props = instance.name.split(".");
          let current = context;
          while (true) {
            const prop = props.shift();
            if (!props.length) {
              current[prop] = instance.impl;
              break;
            }
            current = current[prop] || (current[prop] = {});
          }
        }

        moduleInstances.set(module, instance);
      }
      return instance.impl;
    },
  };

  [asyncModule, cacheModule, lockModule].forEach((module) =>
    context.use(module)
  );

  return context;
}
