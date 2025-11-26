import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { colors, spacing, typography } from "../constants/theme";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
}

export default function LoadingSpinner({
  message,
  size = "large",
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
