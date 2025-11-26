import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

interface Question {
  id: number;
  question_text: string;
  options: { value: number; label: string }[];
}

export default function AttachmentStyleScreen() {
  const { profile } = useAuth();
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  const { data: questions, isLoading } = useApi<Question[]>(
    "/api/attachment/questions",
  );

  const { data: results } = useApi<any>(
    `/api/attachment/couple/${profile?.couple_id}/results`,
    { enabled: showResults },
  );

  const submitAssessment = useApiMutation("/api/attachment/submit", "post", {
    onSuccess: () => {
      Alert.alert("Complete!", "Your attachment style assessment is saved.");
      setShowResults(true);
    },
  });

  const handleSubmit = () => {
    if (Object.keys(answers).length < (questions?.length || 0)) {
      Alert.alert(
        "Incomplete",
        "Please answer all questions before submitting.",
      );
      return;
    }

    const responses = Object.entries(answers).map(([questionId, score]) => ({
      question_id: parseInt(questionId),
      score,
    }));

    submitAssessment.mutate({ responses });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading assessment..." />;
  }

  if (showResults && results) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Your Attachment Style</Text>

          <Card style={styles.resultCard}>
            <Text style={styles.styleTitle}>{results.primary_style}</Text>
            <Text style={styles.styleDescription}>{results.description}</Text>

            <View style={styles.scoresSection}>
              <Text style={styles.sectionTitle}>Your Scores:</Text>
              {results.scores?.map((item: any) => (
                <View key={item.style} style={styles.scoreRow}>
                  <Text style={styles.scoreName}>{item.style}</Text>
                  <View style={styles.scoreBar}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        { width: `${(item.score / 50) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreValue}>{item.score}</Text>
                </View>
              ))}
            </View>

            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Key Insights:</Text>
              {results.insights?.map((insight: string, index: number) => (
                <Text key={index} style={styles.insightText}>
                  • {insight}
                </Text>
              ))}
            </View>

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
        <Text style={styles.title}>Attachment Style Assessment</Text>
        <Text style={styles.subtitle}>
          Discover your attachment patterns in relationships
        </Text>

        <Card style={styles.progressCard}>
          <Text style={styles.progressText}>
            {Object.keys(answers).length} / {questions?.length || 0} Answered
          </Text>
        </Card>

        {questions?.map((question, index) => (
          <Card key={question.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.question_text}</Text>

            <View style={styles.optionsContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.optionButton,
                    answers[question.id] === value &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    setAnswers({ ...answers, [question.id]: value })
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      answers[question.id] === value &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabel}>Disagree</Text>
              <Text style={styles.scaleLabel}>Agree</Text>
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  progressCard: { marginBottom: spacing.lg, alignItems: "center" },
  progressText: { ...typography.h6, color: colors.primary },
  questionCard: { marginBottom: spacing.lg },
  questionNumber: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  questionText: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  optionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: { ...typography.h6, color: colors.text },
  optionTextSelected: { color: "#FFFFFF" },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  scaleLabel: { ...typography.bodySmall, color: colors.textSecondary },
  submitButton: { marginTop: spacing.lg, marginBottom: spacing.xxl },
  resultCard: { marginBottom: spacing.lg },
  styleTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  styleDescription: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  scoresSection: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  scoreName: { ...typography.body, color: colors.text, width: 100 },
  scoreBar: {
    flex: 1,
    height: 24,
    backgroundColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  scoreBarFill: { height: "100%", backgroundColor: colors.primary },
  scoreValue: {
    ...typography.h6,
    color: colors.text,
    width: 40,
    textAlign: "right",
  },
  insightsSection: { marginBottom: spacing.xl },
  insightText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
