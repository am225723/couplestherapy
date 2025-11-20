import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../constants/theme';

type Horseman = 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling';

export default function FourHorsemenScreen() {
  const [selectedHorseman, setSelectedHorseman] = useState<Horseman | null>(null);
  const [situation, setSituation] = useState('');

  const horsemen = [
    {
      type: 'criticism' as Horseman,
      name: 'Criticism',
      emoji: '🗣️',
      description: 'Attacking character instead of behavior',
      example: '"You always..." or "You never..."',
      antidote: 'Use gentle start-up: "I feel... when... I need..."',
    },
    {
      type: 'contempt' as Horseman,
      name: 'Contempt',
      emoji: '😤',
      description: 'Treating partner with disrespect',
      example: 'Sarcasm, eye-rolling, mockery',
      antidote: 'Build culture of appreciation and respect',
    },
    {
      type: 'defensiveness' as Horseman,
      name: 'Defensiveness',
      emoji: '🛡️',
      description: 'Warding off perceived attack',
      example: 'Making excuses, playing victim',
      antidote: 'Take responsibility, even for small part',
    },
    {
      type: 'stonewalling' as Horseman,
      name: 'Stonewalling',
      emoji: '🧱',
      description: 'Shutting down and withdrawing',
      example: 'Silent treatment, walking away',
      antidote: 'Self-soothe, then reengage calmly',
    },
  ];

  const logHorseman = useApiMutation('/api/four-horsemen/log', 'post', {
    onSuccess: () => {
      Alert.alert('Logged', 'Awareness is the first step to change!');
      setSelectedHorseman(null);
      setSituation('');
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Four Horsemen Tracker</Text>
        <Text style={styles.subtitle}>Gottman's predictors of relationship distress</Text>

        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Why Track These?</Text>
          <Text style={styles.warningText}>
            The Four Horsemen are communication patterns that predict relationship problems. By
            noticing them, you can choose healthier responses.
          </Text>
        </Card>

        {horsemen.map((horseman) => (
          <Card key={horseman.type} style={styles.horsemanCard}>
            <View style={styles.horsemanHeader}>
              <Text style={styles.horsemanEmoji}>{horseman.emoji}</Text>
              <View style={styles.horsemanInfo}>
                <Text style={styles.horsemanName}>{horseman.name}</Text>
                <Text style={styles.horsemanDescription}>{horseman.description}</Text>
              </View>
            </View>

            <Card style={styles.exampleCard}>
              <Text style={styles.exampleLabel}>Example:</Text>
              <Text style={styles.exampleText}>{horseman.example}</Text>
            </Card>

            <Card style={styles.antidoteCard}>
              <Text style={styles.antidoteLabel}>Antidote:</Text>
              <Text style={styles.antidoteText}>{horseman.antidote}</Text>
            </Card>

            <Button
              title="I noticed this"
              variant="outline"
              onPress={() => setSelectedHorseman(horseman.type)}
            />
          </Card>
        ))}

        {selectedHorseman && (
          <Card style={styles.logCard}>
            <Text style={styles.logTitle}>
              Log {horsemen.find(h => h.type === selectedHorseman)?.name}
            </Text>
            <Text style={styles.logPrompt}>What happened? (No judgment - just awareness)</Text>

            <TextInput
              style={styles.textArea}
              value={situation}
              onChangeText={setSituation}
              placeholder="Describe the situation..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.logButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setSelectedHorseman(null);
                  setSituation('');
                }}
                style={styles.logButton}
              />
              <Button
                title="Log It"
                onPress={() => {
                  logHorseman.mutate({
                    horseman_type: selectedHorseman,
                    situation,
                  });
                }}
                disabled={!situation.trim() || logHorseman.isPending}
                style={styles.logButton}
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
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  warningCard: { marginBottom: spacing.xl, backgroundColor: colors.warning + '10' },
  warningTitle: { ...typography.h6, color: colors.warning, marginBottom: spacing.sm },
  warningText: { ...typography.body, color: colors.text },
  horsemanCard: { marginBottom: spacing.lg },
  horsemanHeader: { flexDirection: 'row', marginBottom: spacing.md },
  horsemanEmoji: { fontSize: 36, marginRight: spacing.md },
  horsemanInfo: { flex: 1 },
  horsemanName: { ...typography.h5, color: colors.text, marginBottom: spacing.xs },
  horsemanDescription: { ...typography.body, color: colors.textSecondary },
  exampleCard: { marginBottom: spacing.md, backgroundColor: colors.background },
  exampleLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  exampleText: { ...typography.body, color: colors.text, fontStyle: 'italic' },
  antidoteCard: { marginBottom: spacing.md, backgroundColor: colors.success + '10' },
  antidoteLabel: { ...typography.bodySmall, color: colors.success, marginBottom: spacing.xs },
  antidoteText: { ...typography.body, color: colors.text, fontWeight: '600' },
  logCard: { marginTop: spacing.lg },
  logTitle: { ...typography.h5, color: colors.primary, marginBottom: spacing.sm },
  logPrompt: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    color: colors.text,
    marginBottom: spacing.md,
  },
  logButtons: { flexDirection: 'row', gap: spacing.md },
  logButton: { flex: 1 },
});
