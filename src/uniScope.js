const scopes = {};

export default function (name) {
  if (arguments.length < 2) {
    return scopes[name];
  }
  const [, func, onFinalize] = arguments;
  let scope = scopes[name];
  if (!scope) {
    scopes[name] = scope = { count: 0 };
  }
  try {
    try {
      scope.count++;
      return func(scope);
    } finally {
      onFinalize && onFinalize(scope);
    }
  } finally {
    scope.count--;
    if (scope.count <= 0) {
      delete scopes[name];
      scope.onDispose && scope.onDispose(scope);
    }
  }
}
