export const colors = {
  primary: "#14b8a6",
  primaryDark: "#0d9488",
  primaryLight: "#2dd4bf",

  secondary: "#f97316",
  secondaryDark: "#ea580c",
  secondaryLight: "#fb923c",

  accent: "#a855f7",
  accentDark: "#9333ea",
  accentLight: "#c084fc",

  pink: "#ec4899",
  pinkDark: "#db2777",
  pinkLight: "#f472b6",

  background: "#ffffff",
  backgroundDark: "#0f172a",
  surface: "#f8fafc",
  surfaceDark: "#1e293b",

  text: "#1e293b",
  textSecondary: "#64748b",
  textTertiary: "#94a3b8",
  textDark: "#f1f5f9",
  textSecondaryDark: "#cbd5e1",
  textTertiaryDark: "#94a3b8",

  border: "#e2e8f0",
  borderDark: "#334155",

  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",

  white: "#ffffff",
  black: "#000000",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  h5: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  h6: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
