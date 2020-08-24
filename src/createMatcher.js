const matchAny = () => true;

export default function createMatcher(input) {
  if (input === "*") return matchAny;
  // is action chain
  if (input.indexOf(">") !== -1) {
    const chain = input.split(">").map((x) => x.trim());
    let index = 0;

    return (x) => {
      if (x !== chain[index]) return false;
      index++;
      return index >= chain.length;
    };
  } else {
    const list = input.split("|").map((x) => x.trim());
    if (list.length === 1) {
      const actionName = list[0];
      return (x) => actionName === x;
    }
    return (x) => list.includes(x);
  }
}
