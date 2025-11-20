import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

type Phase = 'truths' | 'guesses' | 'results';

export default function LoveMapQuizScreen() {
  const { profile } = useAuth();
  const [phase, setPhase] = useState<Phase>('truths');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');

  const { data: questions, isLoading } = useApi<any[]>(
    `/api/love-map/couple/${profile?.couple_id}/questions`
  );

  const submitTruth = useApiMutation('/api/love-map/truths', 'post', {
    onSuccess: () => {
      setAnswer('');
      if (currentIndex < (questions?.length || 0) - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        Alert.alert('Complete!', 'Now guess your partner\'s answers!');
        setPhase('guesses');
        setCurrentIndex(0);
      }
    },
  });

  const submitGuess = useApiMutation('/api/love-map/guesses', 'post', {
    onSuccess: () => {
      setAnswer('');
      if (currentIndex < (questions?.length || 0) - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        Alert.alert('Done!', 'See how well you know each other!');
        setPhase('results');
      }
    },
  });

  const { data: results } = useApi<any>(
    `/api/love-map/couple/${profile?.couple_id}/results`,
    { enabled: phase === 'results' }
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading Love Map..." />;
  }

  const currentQuestion = questions?.[currentIndex];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Love Map Quiz</Text>
        <Text style={styles.subtitle}>How well do you know your partner?</Text>

        {phase === 'truths' && currentQuestion && (
          <Card style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>Phase 1: Your Truths</Text>
            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Your answer..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Button
              title="Submit Answer"
              onPress={() => {
                if (!answer.trim()) {
                  Alert.alert('Error', 'Please enter an answer');
                  return;
                }
                submitTruth.mutate({
                  question_id: currentQuestion.id,
                  answer_text: answer.trim(),
                });
              }}
              disabled={submitTruth.isPending}
              fullWidth
            />
          </Card>
        )}

        {phase === 'guesses' && currentQuestion && (
          <Card style={styles.phaseCard}>
            <Text style={styles.phaseTitle}>Phase 2: Guess Your Partner</Text>
            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="What do you think they'd say?"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Button
              title="Submit Guess"
              onPress={() => {
                if (!answer.trim()) {
                  Alert.alert('Error', 'Please enter a guess');
                  return;
                }
                submitGuess.mutate({
                  question_id: currentQuestion.id,
                  guess_text: answer.trim(),
                });
              }}
              disabled={submitGuess.isPending}
              fullWidth
            />
          </Card>
        )}

        {phase === 'results' && results && (
          <Card style={styles.resultsCard}>
            <Text style={styles.phaseTitle}>Your Results</Text>
            <Text style={styles.scoreText}>
              {results.matches_count} / {results.total_questions} Correct
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
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  phaseCard: { marginBottom: spacing.lg },
  phaseTitle: { ...typography.h4, color: colors.primary, marginBottom: spacing.md },
  questionText: { ...typography.h5, color: colors.text, marginBottom: spacing.lg },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    color: colors.text,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  resultsCard: { marginBottom: spacing.lg },
  scoreText: { ...typography.h3, color: colors.primary, textAlign: 'center', marginTop: spacing.md },
});
