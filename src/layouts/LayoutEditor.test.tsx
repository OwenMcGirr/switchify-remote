import { fireEvent, render, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { LayoutEditor } from "./LayoutEditor";
import { initialLayout } from "./model";

jest.mock("react-native-gesture-handler", () => {
  const { View } = jest.requireActual("react-native");
  const gesture = () => {
    const g: Record<string, unknown> = {};
    for (const name of [
      "enabled",
      "activateAfterLongPress",
      "runOnJS",
      "onStart",
      "onUpdate",
      "onEnd",
      "onFinalize",
    ])
      g[name] = () => g;
    return g;
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: { Pan: gesture },
  };
});

const command = jest.fn();
const controls = [
  { id: "a", label: "Click", onPress: command },
  { id: "b", label: "Enter", onPress: command },
];
const setup = async (onSave = jest.fn().mockResolvedValue(undefined)) => {
  const onClose = jest.fn();
  const view = await render(
    <LayoutEditor
      visible
      controls={controls}
      initial={initialLayout(["a", "b"])}
      onSave={onSave}
      onClose={onClose}
      onDismiss={jest.fn()}
    />,
  );
  return { ...view, onSave, onClose };
};
beforeEach(() => jest.clearAllMocks());
it("moves and swaps using accessible cells without dispatching a command", async () => {
  const view = await setup();
  await fireEvent.press(view.getByLabelText("Row 1, column 1: Click"));
  await fireEvent.press(view.getByText("Move button"));
  await fireEvent.press(view.getByLabelText("Row 1, column 2: Enter"));
  await fireEvent.press(view.getByText("Save layout"));
  expect(view.onSave).toHaveBeenCalledWith({
    columns: 3,
    cells: ["b", "a", null],
  });
  expect(command).not.toHaveBeenCalled();
});
it("removes a control and restores it from an empty cell", async () => {
  const view = await setup();
  await fireEvent.press(view.getByLabelText("Row 1, column 1: Click"));
  await fireEvent.press(view.getByText("Remove button"));
  await fireEvent.press(view.getByLabelText("Row 1, column 3: Empty"));
  await fireEvent.press(view.getByText("Add Click"));
  await fireEvent.press(view.getByText("Save layout"));
  expect(view.onSave).toHaveBeenCalledWith({
    columns: 3,
    cells: [null, "b", "a"],
  });
});
it("keeps the draft after a sanitized save failure and retries", async () => {
  const save = jest
    .fn()
    .mockRejectedValueOnce(new Error("private"))
    .mockResolvedValueOnce(undefined);
  const view = await setup(save);
  await fireEvent.press(view.getByText("Add row at end"));
  await fireEvent.press(view.getByText("Save layout"));
  expect(view.getByText("Layout could not be saved. Try again.")).toBeTruthy();
  expect(view.queryByText("private")).toBeNull();
  expect(view.onClose).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText("Save layout"));
  expect(save.mock.calls[0]).toEqual(save.mock.calls[1]);
  expect(view.onClose).toHaveBeenCalledTimes(1);
});
it("confirms discarding edits and removing occupied rows", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  const view = await setup();
  await fireEvent.press(view.getByText("Add row at end"));
  await fireEvent.press(view.getByLabelText("Row 1, column 1: Click"));
  await fireEvent.press(view.getByText("Remove row"));
  expect(alert).toHaveBeenLastCalledWith(
    "Remove row?",
    expect.any(String),
    expect.any(Array),
  );
  await fireEvent.press(view.getByText("Cancel"));
  expect(alert).toHaveBeenLastCalledWith(
    "Discard layout changes?",
    expect.any(String),
    expect.any(Array),
  );
  expect(view.onSave).not.toHaveBeenCalled();
  alert.mockRestore();
});
it("blocks duplicate saves and handles unmount during saving", async () => {
  let resolve!: () => void;
  const view = await setup(
    jest.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    ),
  );
  await fireEvent.press(view.getByText("Save layout"));
  await fireEvent.press(view.getByText("Saving layout"));
  expect(view.onSave).toHaveBeenCalledTimes(1);
  await view.unmount();
  await act(async () => resolve());
  expect(view.onClose).not.toHaveBeenCalled();
});
