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
import { SharedGoal } from "../../types";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

export default function SharedGoalsScreen() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: goals, isLoading } = useApi<SharedGoal[]>(
    `/api/shared-goals/couple/${profile?.couple_id}`,
  );

  const createGoal = useApiMutation("/api/shared-goals", "post", {
    invalidateQueries: [`/api/shared-goals/couple/${profile?.couple_id}`],
    onSuccess: () => {
      Alert.alert("Success", "Goal added!");
      setTitle("");
      setDescription("");
      setShowForm(false);
    },
  });

  const updateGoalStatus = useApiMutation("/api/shared-goals", "put", {
    invalidateQueries: [`/api/shared-goals/couple/${profile?.couple_id}`],
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a goal title");
      return;
    }

    createGoal.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status: "backlog",
    });
  };

  const handleStatusChange = (
    goalId: number,
    newStatus: "backlog" | "in_progress" | "completed",
  ) => {
    updateGoalStatus.mutate({
      id: goalId,
      status: newStatus,
    });
  };

  const groupedGoals = {
    backlog: goals?.filter((g) => g.status === "backlog") || [],
    in_progress: goals?.filter((g) => g.status === "in_progress") || [],
    completed: goals?.filter((g) => g.status === "completed") || [],
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading goals..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Shared Goals</Text>
        <Text style={styles.subtitle}>
          Set and track goals together as a couple
        </Text>

        {!showForm ? (
          <Button
            title="+ Add New Goal"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
          />
        ) : (
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goal Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Save for vacation"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details about this goal..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowForm(false);
                  setTitle("");
                  setDescription("");
                }}
                style={styles.formButton}
              />
              <Button
                title="Add Goal"
                onPress={handleSubmit}
                disabled={createGoal.isPending}
                style={styles.formButton}
              />
            </View>
          </Card>
        )}

        <View style={styles.column}>
          <Text style={styles.columnTitle}>📋 Backlog</Text>
          {groupedGoals.backlog.map((goal) => (
            <Card key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              {goal.description && (
                <Text style={styles.goalDescription}>{goal.description}</Text>
              )}
              <View style={styles.statusButtons}>
                <Button
                  title="Start"
                  variant="primary"
                  onPress={() => handleStatusChange(goal.id, "in_progress")}
                  style={styles.statusButton}
                />
                <Button
                  title="Complete"
                  variant="outline"
                  onPress={() => handleStatusChange(goal.id, "completed")}
                  style={styles.statusButton}
                />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.column}>
          <Text style={styles.columnTitle}>🚀 In Progress</Text>
          {groupedGoals.in_progress.map((goal) => (
            <Card key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              {goal.description && (
                <Text style={styles.goalDescription}>{goal.description}</Text>
              )}
              <View style={styles.statusButtons}>
                <Button
                  title="Move to Backlog"
                  variant="outline"
                  onPress={() => handleStatusChange(goal.id, "backlog")}
                  style={styles.statusButton}
                />
                <Button
                  title="Complete"
                  variant="primary"
                  onPress={() => handleStatusChange(goal.id, "completed")}
                  style={styles.statusButton}
                />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.column}>
          <Text style={styles.columnTitle}>✅ Completed</Text>
          {groupedGoals.completed.map((goal) => (
            <Card key={goal.id} style={[styles.goalCard, styles.completedCard]}>
              <Text style={[styles.goalTitle, styles.completedTitle]}>
                {goal.title}
              </Text>
              {goal.description && (
                <Text style={styles.goalDescription}>{goal.description}</Text>
              )}
              <Button
                title="Reopen"
                variant="outline"
                onPress={() => handleStatusChange(goal.id, "backlog")}
                fullWidth
              />
            </Card>
          ))}
        </View>
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
  formButtons: { flexDirection: "row", gap: spacing.sm },
  formButton: { flex: 1 },
  column: { marginBottom: spacing.xl },
  columnTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  goalCard: { marginBottom: spacing.md },
  goalTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.xs },
  goalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statusButtons: { flexDirection: "row", gap: spacing.sm },
  statusButton: { flex: 1 },
  completedCard: { opacity: 0.8 },
  completedTitle: { textDecorationLine: "line-through" },
});
