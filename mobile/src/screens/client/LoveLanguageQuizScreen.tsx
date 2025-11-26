import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { LoveLanguageResult } from "../../types";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

const questions = [
  {
    id: 1,
    text: "I feel most loved when...",
    options: [
      {
        language: "words_of_affirmation",
        text: "My partner tells me they love me",
      },
      { language: "quality_time", text: "We spend quality time together" },
      {
        language: "receiving_gifts",
        text: "My partner gives me thoughtful gifts",
      },
      { language: "acts_of_service", text: "My partner helps me with tasks" },
      { language: "physical_touch", text: "We cuddle or hold hands" },
    ],
  },
  {
    id: 2,
    text: "I appreciate it most when...",
    options: [
      {
        language: "words_of_affirmation",
        text: "I receive compliments and encouragement",
      },
      { language: "quality_time", text: "We have uninterrupted conversations" },
      { language: "receiving_gifts", text: "I get surprise presents" },
      { language: "acts_of_service", text: "Chores are done without asking" },
      { language: "physical_touch", text: "I get hugs and kisses" },
    ],
  },
  {
    id: 3,
    text: "My ideal date would be...",
    options: [
      {
        language: "words_of_affirmation",
        text: "Sharing our feelings and dreams",
      },
      { language: "quality_time", text: "A long walk together" },
      { language: "receiving_gifts", text: "Exchanging meaningful gifts" },
      {
        language: "acts_of_service",
        text: "Having my partner plan everything",
      },
      { language: "physical_touch", text: "Dancing close together" },
    ],
  },
  {
    id: 4,
    text: "I feel disconnected when...",
    options: [
      { language: "words_of_affirmation", text: "I don't hear positive words" },
      { language: "quality_time", text: "We're too busy for each other" },
      { language: "receiving_gifts", text: "Special occasions are forgotten" },
      { language: "acts_of_service", text: "I have to do everything alone" },
      { language: "physical_touch", text: "There's no physical affection" },
    ],
  },
  {
    id: 5,
    text: "I show love by...",
    options: [
      {
        language: "words_of_affirmation",
        text: "Expressing my feelings verbally",
      },
      { language: "quality_time", text: "Making time for my partner" },
      { language: "receiving_gifts", text: "Giving thoughtful presents" },
      { language: "acts_of_service", text: "Doing things to help" },
      { language: "physical_touch", text: "Physical affection" },
    ],
  },
];

type Language =
  | "words_of_affirmation"
  | "quality_time"
  | "receiving_gifts"
  | "acts_of_service"
  | "physical_touch";

export default function LoveLanguageQuizScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<Language, number>>({
    words_of_affirmation: 0,
    quality_time: 0,
    receiving_gifts: 0,
    acts_of_service: 0,
    physical_touch: 0,
  });
  const [quizStarted, setQuizStarted] = useState(false);

  const { data: existingResult } = useApi<LoveLanguageResult>(
    `/api/love-language/user/${profile?.id}`,
  );

  const saveResult = useApiMutation("/api/love-language", "post", {
    invalidateQueries: [`/api/love-language/user/${profile?.id}`],
    onSuccess: () => {
      Alert.alert("Complete!", "Your love language results have been saved!");
      setQuizStarted(false);
      setCurrentQuestion(0);
      setAnswers({
        words_of_affirmation: 0,
        quality_time: 0,
        receiving_gifts: 0,
        acts_of_service: 0,
        physical_touch: 0,
      });
    },
  });

  const handleAnswer = (language: Language) => {
    const newAnswers = { ...answers, [language]: answers[language] + 1 };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate results
      const languageNames: Record<Language, string> = {
        words_of_affirmation: "Words of Affirmation",
        quality_time: "Quality Time",
        receiving_gifts: "Receiving Gifts",
        acts_of_service: "Acts of Service",
        physical_touch: "Physical Touch",
      };

      const sorted = Object.entries(newAnswers).sort((a, b) => b[1] - a[1]);
      const primary = languageNames[sorted[0][0] as Language];
      const secondary = languageNames[sorted[1][0] as Language];

      saveResult.mutate({
        ...newAnswers,
        primary_language: primary,
        secondary_language: secondary,
      });
    }
  };

  if (existingResult && !quizStarted) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Your Love Language</Text>

          <Card style={styles.resultsCard}>
            <Text style={styles.primaryLabel}>Primary Love Language</Text>
            <Text style={styles.primaryLanguage}>
              {existingResult.primary_language}
            </Text>

            <Text style={styles.secondaryLabel}>Secondary Love Language</Text>
            <Text style={styles.secondaryLanguage}>
              {existingResult.secondary_language}
            </Text>

            <View style={styles.scoresSection}>
              <Text style={styles.scoresTitle}>Breakdown</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Words of Affirmation:</Text>
                <Text style={styles.scoreValue}>
                  {existingResult.words_of_affirmation}
                </Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Quality Time:</Text>
                <Text style={styles.scoreValue}>
                  {existingResult.quality_time}
                </Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Receiving Gifts:</Text>
                <Text style={styles.scoreValue}>
                  {existingResult.receiving_gifts}
                </Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Acts of Service:</Text>
                <Text style={styles.scoreValue}>
                  {existingResult.acts_of_service}
                </Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Physical Touch:</Text>
                <Text style={styles.scoreValue}>
                  {existingResult.physical_touch}
                </Text>
              </View>
            </View>

            <Button
              title="Retake Quiz"
              variant="outline"
              onPress={() => setQuizStarted(true)}
              fullWidth
            />
          </Card>
        </View>
      </ScrollView>
    );
  }

  if (!quizStarted) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Love Language Quiz</Text>
          <Text style={styles.subtitle}>
            Discover how you give and receive love
          </Text>

          <Card>
            <Text style={styles.description}>
              This quiz will help you understand your primary and secondary love
              languages. Answer honestly about what makes you feel most loved
              and valued in your relationship.
            </Text>

            <Text style={styles.description}>The five love languages are:</Text>

            <View style={styles.languageList}>
              <Text style={styles.languageItem}>• Words of Affirmation</Text>
              <Text style={styles.languageItem}>• Quality Time</Text>
              <Text style={styles.languageItem}>• Receiving Gifts</Text>
              <Text style={styles.languageItem}>• Acts of Service</Text>
              <Text style={styles.languageItem}>• Physical Touch</Text>
            </View>

            <Button
              title="Start Quiz"
              onPress={() => setQuizStarted(true)}
              fullWidth
            />
          </Card>
        </View>
      </ScrollView>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.questionNumber}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>

        <Card style={styles.questionCard}>
          <Text style={styles.questionText}>{question.text}</Text>

          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <Button
                key={index}
                title={option.text}
                variant="outline"
                onPress={() => handleAnswer(option.language as Language)}
                style={styles.optionButton}
              />
            ))}
          </View>
        </Card>
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
  description: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  languageList: { marginVertical: spacing.md },
  languageItem: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  questionNumber: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  questionCard: { marginTop: spacing.md },
  questionText: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  optionsContainer: { gap: spacing.sm },
  optionButton: { marginBottom: spacing.sm },
  resultsCard: { marginTop: spacing.lg },
  primaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  primaryLanguage: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  secondaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  secondaryLanguage: {
    ...typography.h5,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
  scoresSection: { marginVertical: spacing.lg },
  scoresTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  scoreLabel: { ...typography.body, color: colors.textSecondary },
  scoreValue: { ...typography.body, color: colors.text, fontWeight: "600" },
});
