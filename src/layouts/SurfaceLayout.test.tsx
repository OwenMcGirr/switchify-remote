import { act, fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { SurfaceLayout } from "./SurfaceLayout";
import { layoutStore } from "./LayoutStore";
import { TypingSurface } from "@/remote/TypingSurface";
import { RemoteSession } from "@/remote/RemoteSession";
import type { ConnectionManager } from "@/connection/ConnectionManager";

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
beforeEach(async () => {
  await layoutStore.save("mouse", null);
  await layoutStore.save("typing", null);
});
it("preserves custom positions, labels, availability and original action handlers", async () => {
  await layoutStore.save("mouse", { columns: 3, cells: ["b", null, "a"] });
  const a = jest.fn();
  const b = jest.fn();
  const controls = [
    { id: "a", label: "Start drag", onPress: a },
    { id: "b", label: "Click", onPress: b },
  ];
  const view = await render(
    <SurfaceLayout surface="mouse" controls={controls}>
      <Text>Default arrangement</Text>
    </SurfaceLayout>,
  );
  expect(view.queryByText("Default arrangement")).toBeNull();
  expect(
    view
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel),
  ).toEqual(["Edit layout", "Click", "Start drag"]);
  await fireEvent.press(view.getByText("Click"));
  expect(b).toHaveBeenCalledTimes(1);
  await view.rerender(
    <SurfaceLayout
      surface="mouse"
      controls={[
        { ...controls[0]!, label: "End drag", selected: true },
        { ...controls[1]!, disabled: true },
      ]}
    >
      <Text>Default arrangement</Text>
    </SurfaceLayout>,
  );
  expect(
    view.getByLabelText("End drag").props.accessibilityState.selected,
  ).toBe(true);
  expect(view.getByLabelText("Click").props.accessibilityState.disabled).toBe(
    true,
  );
  expect(view.getAllByRole("button")).toHaveLength(3);
});
it("uses defaults for unknown saved controls and blocks editing during active input", async () => {
  await layoutStore.save("mouse", { columns: 1, cells: ["obsolete"] });
  const view = await render(
    <SurfaceLayout surface="mouse" controls={[]} blocked="Stop movement first.">
      <Text>Default arrangement</Text>
    </SurfaceLayout>,
  );
  expect(view.getByText("Default arrangement")).toBeTruthy();
  expect(
    view.getByLabelText("Edit layout").props.accessibilityState.disabled,
  ).toBe(true);
});
it("keeps live text mounted and unchanged while editing and saving its key layout", async () => {
  const send = jest.fn(async () => true);
  const session = new RemoteSession(
    { send } as unknown as ConnectionManager,
    null,
  );
  jest.spyOn(session, "supports").mockReturnValue(true);
  jest.spyOn(session, "supportsAll").mockReturnValue(true);
  const view = await render(
    <TypingSurface session={session} mode="live" draft="" />,
  );
  await fireEvent.changeText(view.getByLabelText("Live text"), "fixture text");
  await act(async () => {
    await Promise.resolve();
  });
  const count = send.mock.calls.length;
  await fireEvent.press(view.getByText("Edit layout"));
  await fireEvent.press(view.getByText("Add row at end"));
  await fireEvent.press(view.getByText("Save layout"));
  expect(view.getByLabelText("Live text").props.value).toBe("fixture text");
  expect(send).toHaveBeenCalledTimes(count);
  await view.unmount();
  session.dispose();
});
