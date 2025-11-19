import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../constants/theme';

const INTERESTS = [
  { id: 'food', emoji: '🍽️', label: 'Dining & Food' },
  { id: 'outdoors', emoji: '🌲', label: 'Outdoor Activities' },
  { id: 'arts', emoji: '🎨', label: 'Arts & Culture' },
  { id: 'entertainment', emoji: '🎭', label: 'Entertainment' },
  { id: 'relaxation', emoji: '🧘', label: 'Relaxation' },
  { id: 'adventure', emoji: '🎢', label: 'Adventure' },
  { id: 'learning', emoji: '📚', label: 'Learning' },
  { id: 'sports', emoji: '⚽', label: 'Sports & Fitness' },
  { id: 'music', emoji: '🎵', label: 'Music & Dance' },
  { id: 'romance', emoji: '💑', label: 'Romantic' },
  { id: 'social', emoji: '👥', label: 'Social Activities' },
  { id: 'home', emoji: '🏠', label: 'At-Home Fun' },
];

export default function DateNightScreen() {
  const { profile } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState(10);
  const [generatedIdeas, setGeneratedIdeas] = useState<any[]>([]);

  const generateIdeas = useApiMutation(
    '/api/perplexity/date-night',
    'post',
    {
      onSuccess: (data) => {
        setGeneratedIdeas(data.suggestions || []);
      },
    }
  );

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleGenerate = () => {
    if (selectedInterests.length === 0) {
      Alert.alert('Select Interests', 'Please select at least one interest');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Add Location', 'Please enter your city or zip code');
      return;
    }

    generateIdeas.mutate({
      interests: selectedInterests,
      location: location.trim(),
      distance_miles: distance,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Date Night Generator</Text>
        <Text style={styles.subtitle}>
          Get AI-powered date ideas tailored to your preferences
        </Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Interests</Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => (
              <Button
                key={interest.id}
                title={`${interest.emoji} ${interest.label}`}
                variant={selectedInterests.includes(interest.id) ? 'primary' : 'outline'}
                onPress={() => toggleInterest(interest.id)}
                style={styles.interestButton}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter city or zip code"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Distance: {distance} miles</Text>
          <View style={styles.distanceButtons}>
            {[5, 10, 15, 20, 30].map((d) => (
              <Button
                key={d}
                title={`${d}mi`}
                variant={distance === d ? 'primary' : 'outline'}
                onPress={() => setDistance(d)}
                style={styles.distanceButton}
              />
            ))}
          </View>
        </Card>

        <Button
          title="✨ Generate Date Ideas"
          onPress={handleGenerate}
          fullWidth
          disabled={generateIdeas.isPending}
        />

        {generateIdeas.isPending && (
          <Card style={styles.loadingCard}>
            <Text style={styles.loadingText}>
              Generating personalized date ideas...
            </Text>
          </Card>
        )}

        {generatedIdeas.length > 0 && (
          <View style={styles.ideasSection}>
            <Text style={styles.sectionTitle}>Your Date Ideas</Text>
            {generatedIdeas.map((idea, index) => (
              <Card key={index} style={styles.ideaCard}>
                <Text style={styles.ideaTitle}>{idea.title}</Text>
                <Text style={styles.ideaDescription}>{idea.description}</Text>
                {idea.location && (
                  <Text style={styles.ideaLocation}>📍 {idea.location}</Text>
                )}
                {idea.estimated_cost && (
                  <Text style={styles.ideaCost}>💰 {idea.estimated_cost}</Text>
                )}
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
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.md },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  interestButton: { margin: spacing.xs, minWidth: '45%' },
  label: { ...typography.h6, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
  },
  distanceButtons: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  distanceButton: { margin: spacing.xs },
  loadingCard: { marginTop: spacing.lg },
  loadingText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  ideasSection: { marginTop: spacing.lg },
  ideaCard: { marginBottom: spacing.md },
  ideaTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.xs },
  ideaDescription: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  ideaLocation: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  ideaCost: { ...typography.bodySmall, color: colors.textSecondary },
});
