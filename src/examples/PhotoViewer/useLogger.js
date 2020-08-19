export default function (max = 0) {
  let logs = [];

  function entries() {
    return logs;
  }
  function log(message) {
    logs = logs.concat([message]);
    if (max && logs.length >= max) {
      logs.shift();
    }
  }
  function info(message) {
    log("[INFO] " + message);
  }

  function error(message) {
    log("[ERROR] " + message);
  }

  return {
    log,
    info,
    error,
    entries,
  };
}
