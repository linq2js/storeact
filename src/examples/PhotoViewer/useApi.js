const noop = () => {};

export default function (logger = noop) {
  async function api(route, delay) {
    const url = `https://jsonplaceholder.typicode.com/${route}`;
    logger(url);
    const res = await fetch(url);
    const result = await res.json();
    if (delay) {
      return new Promise((resolve) => setTimeout(resolve, delay, result));
    }
    return result;
  }

  return {
    api,
  };
}
