import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { WeeklyCheckin } from '../../types';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

export default function WeeklyCheckinScreen() {
  const { profile } = useAuth();
  const [moodRating, setMoodRating] = useState(5);
  const [connectionRating, setConnectionRating] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [reflection, setReflection] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const { data: checkins, isLoading } = useApi<WeeklyCheckin[]>(
    `/api/weekly-checkins/couple/${profile?.couple_id}`
  );

  const createCheckin = useApiMutation(
    '/api/weekly-checkins',
    'post',
    {
      invalidateQueries: [`/api/weekly-checkins/couple/${profile?.couple_id}`],
      onSuccess: () => {
        Alert.alert('Success', 'Weekly check-in submitted!');
        setReflection('');
      },
    }
  );

  const handleSubmit = () => {
    if (!reflection.trim()) {
      Alert.alert('Error', 'Please add a reflection');
      return;
    }

    createCheckin.mutate({
      mood_rating: moodRating,
      connection_rating: connectionRating,
      stress_level: stressLevel,
      reflection: reflection.trim(),
      is_private: isPrivate,
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading check-ins..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Weekly Check-In</Text>
        <Text style={styles.subtitle}>
          Share how you're feeling and strengthen your connection
        </Text>

        <Card style={styles.formCard}>
          <View style={styles.ratingGroup}>
            <Text style={styles.label}>Mood (1-10)</Text>
            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <Button
                  key={value}
                  title={String(value)}
                  variant={moodRating === value ? 'primary' : 'outline'}
                  onPress={() => setMoodRating(value)}
                  style={styles.ratingButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.ratingGroup}>
            <Text style={styles.label}>Connection with Partner (1-10)</Text>
            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <Button
                  key={value}
                  title={String(value)}
                  variant={connectionRating === value ? 'primary' : 'outline'}
                  onPress={() => setConnectionRating(value)}
                  style={styles.ratingButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.ratingGroup}>
            <Text style={styles.label}>Stress Level (1-10)</Text>
            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <Button
                  key={value}
                  title={String(value)}
                  variant={stressLevel === value ? 'primary' : 'outline'}
                  onPress={() => setStressLevel(value)}
                  style={styles.ratingButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reflection</Text>
            <TextInput
              style={styles.textArea}
              value={reflection}
              onChangeText={setReflection}
              placeholder="What's on your mind this week?"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.privacyToggle}>
            <Button
              title={isPrivate ? 'Private (Only You)' : 'Shared (With Partner)'}
              variant={isPrivate ? 'secondary' : 'primary'}
              onPress={() => setIsPrivate(!isPrivate)}
              fullWidth
            />
          </View>

          <Button
            title="Submit Check-In"
            onPress={handleSubmit}
            fullWidth
            disabled={createCheckin.isPending}
          />
        </Card>

        {checkins && checkins.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Check-Ins</Text>
            {checkins.slice(0, 5).map((checkin) => (
              <Card key={checkin.id} style={styles.checkinCard}>
                <View style={styles.checkinHeader}>
                  <Text style={styles.checkinDate}>
                    {new Date(checkin.created_at).toLocaleDateString()}
                  </Text>
                  {checkin.is_private && (
                    <Text style={styles.privateLabel}>Private</Text>
                  )}
                </View>
                <View style={styles.ratings}>
                  <Text style={styles.ratingText}>Mood: {checkin.mood_rating}/10</Text>
                  <Text style={styles.ratingText}>Connection: {checkin.connection_rating}/10</Text>
                  <Text style={styles.ratingText}>Stress: {checkin.stress_level}/10</Text>
                </View>
                <Text style={styles.reflection}>{checkin.reflection}</Text>
              </Card>
            ))}
          </View>
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
  formCard: { marginBottom: spacing.lg },
  ratingGroup: { marginBottom: spacing.lg },
  label: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
  ratingButtons: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  ratingButton: { margin: spacing.xs, minWidth: 40 },
  inputGroup: { marginBottom: spacing.lg },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    color: colors.text,
  },
  privacyToggle: { marginBottom: spacing.md },
  historySection: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
  checkinCard: { marginBottom: spacing.md },
  checkinHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  checkinDate: { ...typography.bodySmall, color: colors.textSecondary },
  privateLabel: { ...typography.bodySmall, color: colors.secondary, fontWeight: '600' },
  ratings: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  ratingText: { ...typography.bodySmall, color: colors.text },
  reflection: { ...typography.body, color: colors.text },
});
