import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../constants/theme';

type Role = 'speaker' | 'listener';

export default function EchoEmpathyScreen() {
  const { profile } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [message, setMessage] = useState('');
  const [reflection, setReflection] = useState('');
  const [phase, setPhase] = useState<'setup' | 'sharing' | 'reflecting' | 'complete'>('setup');

  const startSession = useApiMutation('/api/echo-empathy/sessions', 'post', {
    onSuccess: () => setPhase('sharing'),
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Echo & Empathy</Text>
        <Text style={styles.subtitle}>Practice active listening together</Text>

        {phase === 'setup' && (
          <Card style={styles.setupCard}>
            <Text style={styles.cardTitle}>How It Works</Text>
            <Text style={styles.instructionText}>
              1. One partner shares (Speaker){'\n'}
              2. Other partner reflects back (Listener){'\n'}
              3. Speaker validates if heard correctly{'\n'}
              4. Switch roles
            </Text>

            <View style={styles.roleButtons}>
              <Button
                title="I'll Speak First"
                onPress={() => {
                  setRole('speaker');
                  startSession.mutate({ role: 'speaker' });
                }}
                style={styles.roleButton}
              />
              <Button
                title="I'll Listen First"
                variant="outline"
                onPress={() => {
                  setRole('listener');
                  startSession.mutate({ role: 'listener' });
                }}
                style={styles.roleButton}
              />
            </View>
          </Card>
        )}

        {phase === 'sharing' && role === 'speaker' && (
          <Card>
            <Text style={styles.phaseTitle}>Share Your Thoughts</Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Button
              title="Share"
              onPress={() => {
                if (message.trim()) {
                  setPhase('reflecting');
                }
              }}
              fullWidth
            />
          </Card>
        )}

        {phase === 'reflecting' && (
          <Card>
            <Text style={styles.phaseTitle}>Reflect Back</Text>
            <Text style={styles.messageText}>{message}</Text>
            <TextInput
              style={styles.textArea}
              value={reflection}
              onChangeText={setReflection}
              placeholder="I heard you say..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Button
              title="Submit Reflection"
              onPress={() => {
                if (reflection.trim()) {
                  Alert.alert('Success!', 'Great job listening!');
                  setPhase('complete');
                }
              }}
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
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  setupCard: {},
  cardTitle: { ...typography.h4, color: colors.primary, marginBottom: spacing.md },
  instructionText: { ...typography.body, color: colors.text, marginBottom: spacing.lg },
  roleButtons: { gap: spacing.md },
  roleButton: { width: '100%' },
  phaseTitle: { ...typography.h4, color: colors.primary, marginBottom: spacing.md },
  messageText: { ...typography.body, color: colors.text, marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: 8 },
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
