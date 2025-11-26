import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { Ritual } from "../../types";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

export default function RitualsScreen() {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [showForm, setShowForm] = useState(false);

  const { data: rituals, isLoading } = useApi<Ritual[]>(
    `/api/rituals/couple/${profile?.couple_id}`,
  );

  const createRitual = useApiMutation("/api/rituals", "post", {
    invalidateQueries: [`/api/rituals/couple/${profile?.couple_id}`],
    onSuccess: () => {
      Alert.alert("Success", "Ritual created!");
      setName("");
      setDescription("");
      setShowForm(false);
    },
  });

  const completeRitual = useApiMutation("/api/rituals/complete", "post", {
    invalidateQueries: [`/api/rituals/couple/${profile?.couple_id}`],
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a ritual name");
      return;
    }

    createRitual.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      frequency,
    });
  };

  const handleComplete = (ritualId: number) => {
    completeRitual.mutate({ ritual_id: ritualId });
    Alert.alert("Great!", "Ritual completed! Keep up the connection.");
  };

  const getDaysSinceCompletion = (lastCompleted?: string) => {
    if (!lastCompleted) return null;
    const days = Math.floor(
      (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24),
    );
    return days;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading rituals..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rituals of Connection</Text>
        <Text style={styles.subtitle}>
          Create meaningful routines that strengthen your bond
        </Text>

        {!showForm ? (
          <Button
            title="+ Add New Ritual"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
          />
        ) : (
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ritual Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Morning coffee together"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="What does this ritual involve?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyButtons}>
                <Button
                  title="Daily"
                  variant={frequency === "daily" ? "primary" : "outline"}
                  onPress={() => setFrequency("daily")}
                  style={styles.frequencyButton}
                />
                <Button
                  title="Weekly"
                  variant={frequency === "weekly" ? "primary" : "outline"}
                  onPress={() => setFrequency("weekly")}
                  style={styles.frequencyButton}
                />
                <Button
                  title="Monthly"
                  variant={frequency === "monthly" ? "primary" : "outline"}
                  onPress={() => setFrequency("monthly")}
                  style={styles.frequencyButton}
                />
              </View>
            </View>

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowForm(false);
                  setName("");
                  setDescription("");
                }}
                style={styles.formButton}
              />
              <Button
                title="Create Ritual"
                onPress={handleSubmit}
                disabled={createRitual.isPending}
                style={styles.formButton}
              />
            </View>
          </Card>
        )}

        {rituals && rituals.length > 0 ? (
          <View style={styles.ritualsSection}>
            {rituals.map((ritual) => {
              const daysSince = getDaysSinceCompletion(ritual.last_completed);

              return (
                <Card key={ritual.id} style={styles.ritualCard}>
                  <View style={styles.ritualHeader}>
                    <View style={styles.ritualInfo}>
                      <Text style={styles.ritualName}>{ritual.name}</Text>
                      <Text style={styles.ritualFrequency}>
                        {ritual.frequency.charAt(0).toUpperCase() +
                          ritual.frequency.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {ritual.description && (
                    <Text style={styles.ritualDescription}>
                      {ritual.description}
                    </Text>
                  )}

                  {daysSince !== null && (
                    <Text style={styles.lastCompleted}>
                      Last completed{" "}
                      {daysSince === 0
                        ? "today"
                        : `${daysSince} day${daysSince > 1 ? "s" : ""} ago`}
                    </Text>
                  )}

                  <Button
                    title="✓ Mark Complete"
                    onPress={() => handleComplete(ritual.id)}
                    variant="primary"
                    fullWidth
                  />
                </Card>
              );
            })}
          </View>
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No rituals yet. Create your first ritual to start building
              meaningful connections!
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  addButton: { marginBottom: spacing.lg },
  formCard: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 80,
    color: colors.text,
  },
  frequencyButtons: { flexDirection: "row", gap: spacing.sm },
  frequencyButton: { flex: 1 },
  formButtons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  formButton: { flex: 1 },
  ritualsSection: { marginTop: spacing.md },
  ritualCard: { marginBottom: spacing.md },
  ritualHeader: { marginBottom: spacing.sm },
  ritualInfo: { flex: 1 },
  ritualName: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ritualFrequency: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  ritualDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  lastCompleted: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyState: { marginTop: spacing.lg },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
