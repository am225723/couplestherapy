import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useApiMutation } from "../../hooks/useApi";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { colors, spacing, typography } from "../../constants/theme";

const conversations = [
  {
    id: 1,
    title: "Are You There For Me?",
    description: "Recognize negative patterns",
  },
  {
    id: 2,
    title: "Finding the Raw Spots",
    description: "Identify emotional triggers",
  },
  {
    id: 3,
    title: "Revisiting a Rocky Moment",
    description: "Process past conflicts",
  },
  { id: 4, title: "Hold Me Tight", description: "Connect deeply and safely" },
  { id: 5, title: "Forgiving Injuries", description: "Heal past hurts" },
];

export default function HoldMeTightScreen() {
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [response, setResponse] = useState("");

  const saveResponse = useApiMutation("/api/hold-me-tight/responses", "post", {
    onSuccess: () => {
      setResponse("");
      setSelectedConv(null);
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hold Me Tight</Text>
        <Text style={styles.subtitle}>EFT Conversations for couples</Text>

        <Card style={styles.introCard}>
          <Text style={styles.introText}>
            Based on Dr. Sue Johnson's Emotionally Focused Therapy. These
            conversations help you reconnect and strengthen your emotional bond.
          </Text>
        </Card>

        {conversations.map((conv) => (
          <Card
            key={conv.id}
            style={styles.convCard}
            onPress={() => setSelectedConv(conv.id)}
          >
            <Text style={styles.convTitle}>{conv.title}</Text>
            <Text style={styles.convDescription}>{conv.description}</Text>
          </Card>
        ))}

        {selectedConv && (
          <Card style={styles.responseCard}>
            <Text style={styles.responseTitle}>
              {conversations.find((c) => c.id === selectedConv)?.title}
            </Text>
            <TextInput
              style={styles.textArea}
              value={response}
              onChangeText={setResponse}
              placeholder="Your reflections..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <View style={styles.buttons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setSelectedConv(null);
                  setResponse("");
                }}
                style={styles.button}
              />
              <Button
                title="Save"
                onPress={() => {
                  saveResponse.mutate({
                    conversation_id: selectedConv,
                    response,
                  });
                }}
                disabled={!response.trim()}
                style={styles.button}
              />
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
  introCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary + "10",
  },
  introText: { ...typography.body, color: colors.text },
  convCard: { marginBottom: spacing.md },
  convTitle: {
    ...typography.h6,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  convDescription: { ...typography.body, color: colors.textSecondary },
  responseCard: { marginTop: spacing.lg },
  responseTitle: {
    ...typography.h5,
    color: colors.text,
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
  buttons: { flexDirection: "row", gap: spacing.md },
  button: { flex: 1 },
});
