import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { colors, spacing, typography } from "../../constants/theme";

export default function IFSScreen() {
  const { profile } = useAuth();
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");

  const commonParts = [
    {
      name: "The Protector",
      description: "Tries to keep you safe",
      emoji: "🛡️",
    },
    { name: "The Critic", description: "Points out flaws", emoji: "🗣️" },
    { name: "The Pleaser", description: "Wants everyone happy", emoji: "😊" },
    { name: "The Manager", description: "Stays in control", emoji: "📋" },
    { name: "The Exile", description: "Holds pain or shame", emoji: "💔" },
    { name: "The Firefighter", description: "Numbs or distracts", emoji: "🚒" },
  ];

  const saveExercise = useApiMutation("/api/ifs/exercises", "post", {
    onSuccess: () => {
      setSelectedPart(null);
      setReflection("");
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Internal Family Systems</Text>
        <Text style={styles.subtitle}>
          Explore the different parts of yourself
        </Text>

        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>What is IFS?</Text>
          <Text style={styles.introText}>
            IFS helps you understand that we all have different "parts" -
            protective responses, emotions, and patterns that developed to help
            us cope with life.
          </Text>
          <Text style={styles.introText}>
            By recognizing and understanding these parts, you can heal old
            wounds and respond to your partner with more compassion.
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Common Parts</Text>
        {commonParts.map((part) => (
          <Card
            key={part.name}
            style={[
              styles.partCard,
              selectedPart === part.name && styles.partCardSelected,
            ]}
            onPress={() => setSelectedPart(part.name)}
          >
            <Text style={styles.partEmoji}>{part.emoji}</Text>
            <View style={styles.partInfo}>
              <Text style={styles.partName}>{part.name}</Text>
              <Text style={styles.partDescription}>{part.description}</Text>
            </View>
          </Card>
        ))}

        {selectedPart && (
          <Card style={styles.reflectionCard}>
            <Text style={styles.reflectionTitle}>
              Reflect on "{selectedPart}"
            </Text>
            <Text style={styles.reflectionPrompt}>
              When does this part show up in your relationship? What is it
              trying to protect you from?
            </Text>

            <TextInput
              style={styles.textArea}
              value={reflection}
              onChangeText={setReflection}
              placeholder="Your reflection..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Button
              title="Save Reflection"
              onPress={() => {
                saveExercise.mutate({
                  part_name: selectedPart,
                  reflection,
                });
              }}
              disabled={!reflection.trim() || saveExercise.isPending}
              fullWidth
            />
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
  introCard: {
    marginBottom: spacing.xl,
    backgroundColor: colors.primary + "10",
  },
  introTitle: {
    ...typography.h5,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  introText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  partCard: {
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  partCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  partEmoji: { fontSize: 36, marginRight: spacing.md },
  partInfo: { flex: 1 },
  partName: { ...typography.h6, color: colors.text, marginBottom: spacing.xs },
  partDescription: { ...typography.body, color: colors.textSecondary },
  reflectionCard: { marginTop: spacing.lg },
  reflectionTitle: {
    ...typography.h5,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  reflectionPrompt: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 150,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
