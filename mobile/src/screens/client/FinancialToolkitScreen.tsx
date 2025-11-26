import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

export default function FinancialToolkitScreen() {
  const { profile } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    "values" | "goals" | "discussions"
  >("values");
  const [newGoal, setNewGoal] = useState("");
  const [newValue, setNewValue] = useState("");

  const { data: values, isLoading: valuesLoading } = useApi<any[]>(
    `/api/financial/couple/${profile?.couple_id}/values`,
  );

  const { data: goals, isLoading: goalsLoading } = useApi<any[]>(
    `/api/financial/couple/${profile?.couple_id}/goals`,
  );

  const addValue = useApiMutation("/api/financial/values", "post", {
    invalidateQueries: [`/api/financial/couple/${profile?.couple_id}/values`],
    onSuccess: () => setNewValue(""),
  });

  const addGoal = useApiMutation("/api/financial/goals", "post", {
    invalidateQueries: [`/api/financial/couple/${profile?.couple_id}/goals`],
    onSuccess: () => setNewGoal(""),
  });

  if (valuesLoading || goalsLoading) {
    return <LoadingSpinner message="Loading toolkit..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Financial Toolkit</Text>
        <Text style={styles.subtitle}>Align on money matters together</Text>

        <View style={styles.tabs}>
          <Button
            title="Values"
            variant={selectedTab === "values" ? "primary" : "outline"}
            onPress={() => setSelectedTab("values")}
            style={styles.tab}
          />
          <Button
            title="Goals"
            variant={selectedTab === "goals" ? "primary" : "outline"}
            onPress={() => setSelectedTab("goals")}
            style={styles.tab}
          />
          <Button
            title="Discussions"
            variant={selectedTab === "discussions" ? "primary" : "outline"}
            onPress={() => setSelectedTab("discussions")}
            style={styles.tab}
          />
        </View>

        {selectedTab === "values" && (
          <View>
            <Card style={styles.addCard}>
              <Text style={styles.cardTitle}>
                What do you value about money?
              </Text>
              <TextInput
                style={styles.input}
                value={newValue}
                onChangeText={setNewValue}
                placeholder="e.g., Security, Freedom, Generosity..."
                placeholderTextColor={colors.textSecondary}
              />
              <Button
                title="Add Value"
                onPress={() => addValue.mutate({ value_description: newValue })}
                disabled={!newValue.trim() || addValue.isPending}
                fullWidth
              />
            </Card>

            {values && values.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Shared Values</Text>
                {values.map((value: any) => (
                  <Card key={value.id} style={styles.itemCard}>
                    <Text style={styles.itemText}>
                      {value.value_description}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Added by{" "}
                      {value.created_by === profile?.id ? "you" : "partner"}
                    </Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {selectedTab === "goals" && (
          <View>
            <Card style={styles.addCard}>
              <Text style={styles.cardTitle}>Add a Financial Goal</Text>
              <TextInput
                style={styles.input}
                value={newGoal}
                onChangeText={setNewGoal}
                placeholder="e.g., Save $10k for vacation, Pay off car..."
                placeholderTextColor={colors.textSecondary}
              />
              <Button
                title="Add Goal"
                onPress={() => addGoal.mutate({ goal_description: newGoal })}
                disabled={!newGoal.trim() || addGoal.isPending}
                fullWidth
              />
            </Card>

            {goals && goals.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Shared Goals</Text>
                {goals.map((goal: any) => (
                  <Card key={goal.id} style={styles.itemCard}>
                    <Text style={styles.itemText}>{goal.goal_description}</Text>
                    <Text style={styles.itemMeta}>
                      {goal.is_completed ? "✓ Completed" : "⏳ In Progress"}
                    </Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {selectedTab === "discussions" && (
          <Card>
            <Text style={styles.cardTitle}>Discussion Prompts</Text>
            <View style={styles.promptList}>
              <Text style={styles.promptText}>
                • How did your family handle money growing up?
              </Text>
              <Text style={styles.promptText}>
                • What are your biggest financial fears?
              </Text>
              <Text style={styles.promptText}>
                • What financial goals excite you most?
              </Text>
              <Text style={styles.promptText}>
                • How should we make big purchase decisions?
              </Text>
              <Text style={styles.promptText}>
                • What does financial security mean to you?
              </Text>
            </View>
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
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  tab: { flex: 1 },
  addCard: { marginBottom: spacing.lg },
  cardTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  itemCard: { marginBottom: spacing.md },
  itemText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemMeta: { ...typography.bodySmall, color: colors.textSecondary },
  promptList: { gap: spacing.md },
  promptText: { ...typography.body, color: colors.text },
});
