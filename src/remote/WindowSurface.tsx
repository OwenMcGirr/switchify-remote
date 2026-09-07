import { SurfaceLayout, type LayoutControl } from "@/layouts/SurfaceLayout";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { commandPayloads } from "@/domain/protocol/commands";
import type { PcPlatform } from "@/domain/protocol/types";
import { useTheme } from "@/theme/ThemeContext";
import type { RemoteSession, RemoteSessionState } from "./RemoteSession";

const actions = [
  ["Next app", "switchNext"],
  ["Previous app", "switchPrevious"],
  ["Task view", "taskView"],
  ["Show desktop", "showDesktop"],
  ["Minimize", "minimizeFocused"],
  ["Maximize", "maximizeFocused"],
  ["Close", "closeFocused"],
] as const;

export function WindowSurface({
  session,
  state,
  platform,
}: {
  session: RemoteSession;
  state: RemoteSessionState;
  platform: PcPlatform;
}) {
  const labels: Record<string, string> =
    platform === "macos"
      ? { Ctrl: "Control", Alt: "Option", Shift: "Shift", Meta: "Command" }
      : { Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift", Meta: "Start" };
  const { spacing } = useTheme();
  const blocked =
    state.repeat || state.dragging || state.modifiers.length
      ? "Stop movement, end dragging, and release modifiers before editing."
      : null;
  const modifiers: LayoutControl[] = Object.entries(labels).map(
    ([key, label]) => ({
      id: `modifier.${key}`,
      label,
      disabled: !session.supports(
        state.modifiers.includes(key)
          ? "keyboard.modifierUp"
          : "keyboard.modifierDown",
      ),
      selected: state.modifiers.includes(key),
      onPress: () => void session.toggleModifier(key),
    }),
  );
  const windows: LayoutControl[] = actions.map(([label, action]) => ({
    id: `window.${action}`,
    ...(action === "closeFocused" ? { icon: "warning" as const } : {}),
    label,
    danger: action === "closeFocused",
    disabled: !session.supports("window.control"),
    onPress: () => {
      const [type, payload] = commandPayloads.windowControl(action);
      void session.command(type, payload);
    },
  }));
  const shortcuts: LayoutControl[] = ["A", "C", "V", "X"].map((key) => ({
    id: `shortcut.${key}`,
    label: `${state.modifiers.length ? state.modifiers.map((item) => labels[item]).join("+") + "+" : ""}${key}`,
    disabled: !session.supports("keyboard.shortcut"),
    onPress: () => void session.shortcut(key),
  }));
  const monitors: LayoutControl[] = (
    ["left", "up", "down", "right"] as const
  ).map((direction) => ({
    id: `monitor.${direction}`,
    label: direction[0]!.toUpperCase() + direction.slice(1),
    disabled: !session.supports("pointer.display.move"),
    onPress: () => {
      const [type, payload] = commandPayloads.displayMove(direction);
      void session.command(type, payload);
    },
  }));
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <SurfaceLayout
          surface="window"
          section="modifiers"
          controls={modifiers}
          blocked={blocked}
        />
        <AppText muted variant="caption">
          Held modifiers stay active until selected again, used in a shortcut,
          or the remote disconnects.
        </AppText>
      </Card>
      <Card>
        <SurfaceLayout
          surface="window"
          section="windows"
          controls={windows}
          blocked={blocked}
        />
      </Card>
      <Card>
        <SurfaceLayout
          surface="window"
          section="shortcuts"
          controls={shortcuts}
          blocked={blocked}
        />
      </Card>
      {session.profile?.capabilities.displayNavigation.supported &&
      session.profile.capabilities.displayNavigation.displayCount > 1 ? (
        <Card>
          <SurfaceLayout
            surface="window"
            section="monitors"
            controls={monitors}
            blocked={blocked}
          />
        </Card>
      ) : null}
    </View>
  );
}
