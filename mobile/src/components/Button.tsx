import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import { colors, borderRadius, typography, spacing } from "../constants/theme";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  title,
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.secondary;
      case "outline":
        return "transparent";
      case "ghost":
        return "transparent";
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case "primary":
      case "secondary":
        return colors.white;
      case "outline":
      case "ghost":
        return colors.primary;
      default:
        return colors.white;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  text: {
    ...typography.h6,
  },
});
