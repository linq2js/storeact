import { useRef } from "react";

const refHook = useRef;

export default function isHookEnabled() {
  try {
    return refHook(true).current;
  } catch (e) {
    return false;
  }
}
