import { sectionDefault, getSection, validSectionLayout } from "./sections";
it("captures responsive rows in each section instead of flattening the surface", () => {
  expect(sectionDefault(getSection("mouse", "clicks")!, 460, 1, 8)).toEqual({
    columns: 3,
    cells: [
      "click.double",
      "click.right",
      "drag.toggle",
      "scroll.up",
      "scroll.down",
      null,
    ],
  });
  expect(sectionDefault(getSection("mouse", "clicks")!, 300, 1, 8)).toEqual({
    columns: 2,
    cells: [
      "click.double",
      "click.right",
      "drag.toggle",
      null,
      "scroll.up",
      "scroll.down",
    ],
  });
  expect(
    sectionDefault(getSection("mouse", "movement")!, 300, 2, 8).columns,
  ).toBe(3);
});
it("validates controls against their section, not merely their surface", () => {
  expect(
    validSectionLayout("mouse", "clicks", {
      columns: 1,
      cells: ["click.double"],
    }),
  ).toBe(true);
  expect(
    validSectionLayout("mouse", "speed", {
      columns: 1,
      cells: ["click.double"],
    }),
  ).toBe(false);
  expect(
    validSectionLayout("window", "modifiers", {
      columns: 1,
      cells: ["key.Enter"],
    }),
  ).toBe(false);
  expect(getSection("mouse", "__proto__")).toBeUndefined();
});
