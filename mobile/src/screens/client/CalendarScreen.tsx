import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { CalendarEvent } from '../../types';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

export default function CalendarScreen() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('19:00');

  const { data: events, isLoading } = useApi<CalendarEvent[]>(
    `/api/calendar/couple/${profile?.couple_id}`
  );

  const createEvent = useApiMutation(
    '/api/calendar/events',
    'post',
    {
      invalidateQueries: [`/api/calendar/couple/${profile?.couple_id}`],
      onSuccess: () => {
        Alert.alert('Success', 'Event added to calendar!');
        setTitle('');
        setDescription('');
        setShowForm(false);
      },
    }
  );

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    const startDateTime = `${selectedDate}T${time}:00`;
    const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

    createEvent.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      start_time: startDateTime,
      end_time: endDateTime,
    });
  };

  const markedDates = events?.reduce((acc, event) => {
    const dateKey = event.start_time.split('T')[0];
    acc[dateKey] = { marked: true, dotColor: colors.primary };
    return acc;
  }, {} as any) || {};

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: colors.primary,
  };

  const eventsForSelectedDate = events?.filter(
    event => event.start_time.startsWith(selectedDate)
  ) || [];

  if (isLoading) {
    return <LoadingSpinner message="Loading calendar..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Shared Calendar</Text>
        <Text style={styles.subtitle}>
          Plan and coordinate your time together
        </Text>

        <Card style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary,
              monthTextColor: colors.text,
              arrowColor: colors.primary,
            }}
          />
        </Card>

        <View style={styles.selectedDateSection}>
          <Text style={styles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {!showForm ? (
            <Button
              title="+ Add Event"
              onPress={() => setShowForm(true)}
              style={styles.addButton}
            />
          ) : (
            <Card style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Event Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Date Night"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowForm(false);
                    setTitle('');
                    setDescription('');
                  }}
                  style={styles.formButton}
                />
                <Button
                  title="Add Event"
                  onPress={handleSubmit}
                  disabled={createEvent.isPending}
                  style={styles.formButton}
                />
              </View>
            </Card>
          )}

          {eventsForSelectedDate.length > 0 ? (
            <View style={styles.eventsSection}>
              <Text style={styles.eventsTitle}>Events</Text>
              {eventsForSelectedDate.map((event) => (
                <Card key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                </Card>
              ))}
            </View>
          ) : !showForm && (
            <Text style={styles.noEvents}>No events for this day</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  calendarCard: { marginBottom: spacing.lg, padding: 0 },
  selectedDateSection: { marginTop: spacing.md },
  selectedDateTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.md },
  addButton: { marginBottom: spacing.md },
  formCard: { marginBottom: spacing.md },
  inputGroup: { marginBottom: spacing.md },
  label: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 80,
    color: colors.text,
  },
  formButtons: { flexDirection: 'row', gap: spacing.sm },
  formButton: { flex: 1 },
  eventsSection: { marginTop: spacing.md },
  eventsTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
  eventCard: { marginBottom: spacing.sm },
  eventTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.xs },
  eventTime: { ...typography.bodySmall, color: colors.primary, marginBottom: spacing.xs },
  eventDescription: { ...typography.body, color: colors.textSecondary },
  noEvents: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
