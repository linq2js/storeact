import storeact from "../index";

test("should return new store instance when construct new store with options", () => {
  const definition = (_, options) => {
    return {
      state: () => options,
    };
  };

  const instance1 = storeact(definition, 1);
  const instance2 = storeact(definition, 2);
  const instance3 = storeact(definition, 3);
  const noOptionsInstance1 = storeact(definition);
  const noOptionsInstance2 = storeact(definition);

  expect(instance1).not.toBe(instance2);
  expect(instance2).not.toBe(instance3);
  expect(instance3).not.toBe(instance1);

  expect(noOptionsInstance1).toBe(noOptionsInstance2);
});
