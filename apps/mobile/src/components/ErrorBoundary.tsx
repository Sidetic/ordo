/**
 * Top-level error boundary. Catches render errors anywhere in the tree and
 * shows a small themed fallback instead of a blank/white screen. "Reload"
 * refreshes the page on web; "Try again" clears the error and re-renders.
 */
import React, { Component, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as Updates from "expo-updates";
import { Text } from "./ui/Text";
import { Button } from "./ui/Button";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

async function reload() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.reload();
    return;
  }
  await Updates.reloadAsync();
}

function Fallback({ onReset }: { onReset: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={styles.card}>
        <Text variant="title2">Something went wrong</Text>
        <Text variant="body" color="secondary" style={styles.message}>
          An unexpected error occurred. Reloading usually fixes it.
        </Text>
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button
              label="Reload"
              variant="primary"
              size="lg"
              block
              onPress={() => void reload().catch(onReset)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Try again" variant="secondary" size="lg" block onPress={onReset} />
          </View>
        </View>
      </View>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <Fallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[24] },
  card: { width: "100%", maxWidth: 360, alignItems: "stretch" },
  message: { marginTop: spacing[8] },
  actions: { flexDirection: "row", gap: spacing[10], marginTop: spacing[24] },
});
