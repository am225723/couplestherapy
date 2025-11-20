import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

export default function EnneagramScreen() {
  const { profile } = useAuth();
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  const { data: questions, isLoading } = useApi<any[]>('/api/enneagram/questions');

  const { data: results } = useApi<any>(
    `/api/enneagram/couple/${profile?.couple_id}/results`,
    { enabled: showResults }
  );

  const submitAssessment = useApiMutation(
    '/api/enneagram/submit',
    'post',
    {
      onSuccess: () => {
        Alert.alert('Complete!', 'Your Enneagram results are ready!');
        setShowResults(true);
      },
    }
  );

  const handleSubmit = () => {
    if (Object.keys(answers).length < (questions?.length || 0)) {
      Alert.alert('Incomplete', 'Please answer all questions.');
      return;
    }

    const responses = Object.entries(answers).map(([questionId, score]) => ({
      question_id: parseInt(questionId),
      score,
    }));

    submitAssessment.mutate({ responses });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading Enneagram..." />;
  }

  if (showResults && results) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Your Enneagram Type</Text>

          <Card style={styles.resultCard}>
            <Text style={styles.typeNumber}>Type {results.dominant_type}</Text>
            <Text style={styles.typeName}>{results.type_name}</Text>
            <Text style={styles.typeDescription}>{results.description}</Text>

            <View style={styles.scoresGrid}>
              {results.all_scores?.map((item: any) => (
                <View key={item.type} style={styles.scoreItem}>
                  <Text style={styles.scoreType}>Type {item.type}</Text>
                  <Text style={styles.scoreValue}>{item.score}</Text>
                </View>
              ))}
            </View>

            {results.compatibility && (
              <View style={styles.compatibilitySection}>
                <Text style={styles.sectionTitle}>Couple Compatibility</Text>
                <Text style={styles.compatibilityText}>{results.compatibility}</Text>
              </View>
            )}

            <Button
              title="Retake Assessment"
              variant="outline"
              onPress={() => {
                setShowResults(false);
                setAnswers({});
              }}
              fullWidth
            />
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enneagram Assessment</Text>
        <Text style={styles.subtitle}>Discover your personality type</Text>

        <Card style={styles.progressCard}>
          <Text style={styles.progressText}>
            {Object.keys(answers).length} / {questions?.length || 0} Answered
          </Text>
        </Card>

        {questions?.map((question, index) => (
          <Card key={question.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Statement {index + 1}</Text>
            <Text style={styles.questionText}>{question.statement}</Text>

            <View style={styles.optionsContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.optionButton,
                    answers[question.id] === value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setAnswers({ ...answers, [question.id]: value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers[question.id] === value && styles.optionTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Not me</Text>
              <Text style={styles.scaleLabel}>Very me</Text>
            </View>
          </Card>
        ))}

        <Button
          title="Submit Assessment"
          onPress={handleSubmit}
          disabled={submitAssessment.isPending}
          fullWidth
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  progressCard: { marginBottom: spacing.lg, alignItems: 'center' },
  progressText: { ...typography.h6, color: colors.primary },
  questionCard: { marginBottom: spacing.lg },
  questionNumber: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  questionText: { ...typography.body, color: colors.text, marginBottom: spacing.md },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  optionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { ...typography.h6, color: colors.text },
  optionTextSelected: { color: '#FFFFFF' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { ...typography.bodySmall, color: colors.textSecondary },
  submitButton: { marginTop: spacing.lg, marginBottom: spacing.xxl },
  resultCard: { marginBottom: spacing.lg },
  typeNumber: { ...typography.h2, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
  typeName: { ...typography.h4, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  typeDescription: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  scoreItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  scoreType: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  scoreValue: { ...typography.h5, color: colors.primary },
  compatibilitySection: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.md },
  compatibilityText: { ...typography.body, color: colors.text },
});
