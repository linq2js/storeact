import { boundActionType } from "../types";
import { raceModule } from "./asyncModule";

export default function ({ use }) {
  const race = use(raceModule);

  return {
    name: "lock",
    impl(actions, ...unlockActions) {
      if (!Array.isArray(actions)) {
        actions = [actions];
      }
      const owner = {};
      actions.forEach((action) => {
        if (action.type !== boundActionType) {
          throw new Error("Invalid action");
        }
        action.lock(owner);
      });

      function unlock() {
        actions.forEach((action) => {
          action.unlock(owner);
        });
      }

      if (unlockActions.length) {
        race(...unlockActions).then(unlock);
      }

      return unlock();
    },
  };
}
