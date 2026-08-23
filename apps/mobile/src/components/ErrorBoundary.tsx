/**
 * Top-level error boundary. Catches render errors anywhere in the tree and
 * shows a small themed fallback instead of a blank/white screen. "Reload"
 * refreshes the page on web; "Try again" clears the error and re-renders.
 */
import React, { Component, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import * as Updates from "expo-updates";

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

function Fallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const dark = useColorScheme() === "dark";
  const foreground = dark ? "#F4F1E8" : "#24231F";
  const secondary = dark ? "#AAA79F" : "#656159";
  const background = dark ? "#11110F" : "#EFE7D2";

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: foreground }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: secondary }]}>
          An unexpected error occurred. Reloading usually fixes it.
        </Text>
        <Text style={styles.details} selectable>
          {error.message || error.name}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, styles.primaryButton]}
            onPress={() => void reload().catch(onReset)}
          >
            <Text style={[styles.buttonLabel, styles.primaryButtonLabel]}>Reload</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { borderColor: secondary }]}
            onPress={onReset}
          >
            <Text style={[styles.buttonLabel, { color: foreground }]}>Try again</Text>
          </Pressable>
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
      return <Fallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, alignItems: "stretch" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  message: { marginTop: 8, fontSize: 16, lineHeight: 23 },
  details: { marginTop: 12, color: "#D95D4F", fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  button: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  primaryButton: { backgroundColor: "#EF705F", borderColor: "#EF705F" },
  buttonLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  primaryButtonLabel: { color: "#FFFFFF" },
});
