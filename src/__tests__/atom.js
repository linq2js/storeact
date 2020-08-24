import createAtom from "../createAtom";

test("mapped atom", () => {
  const original = createAtom(1);
  const double = original.map((value) => value * 2);

  expect(double.value).toBe(2);

  original.value++;

  expect(double.value).toBe(4);
});
