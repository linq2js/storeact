import createAtom from "./createAtom";

export default function atomModule({ update }) {
  return (defaultValue, options) =>
    createAtom(defaultValue, { ...options, update });
}
