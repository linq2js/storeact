const modules = {};

export function use(module, context) {
  if (!module.__instance) {
    module.__instance = module({
      ...context,
      use(m) {
        return use(m, context);
      }
    });
  }
  return module.__instance;
}

export function add(name, module) {
  modules[name] = module;
  return () => {
    if (modules[name] === module) {
      delete modules[name];
    }
  };
}

export function all() {
  return modules;
}
