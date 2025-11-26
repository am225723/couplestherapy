import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button";
import { colors, spacing, typography } from "../../constants/theme";

export default function TherapistProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Therapist Profile</Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{profile?.full_name || "N/A"}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email || "N/A"}</Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{profile?.role || "N/A"}</Text>
        </View>

        <Button
          title="Sign Out"
          onPress={signOut}
          variant="secondary"
          fullWidth
          style={styles.signOutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  value: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  signOutButton: { marginTop: spacing.lg },
});
