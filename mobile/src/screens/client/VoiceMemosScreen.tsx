import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { VoiceMemo } from '../../types';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

export default function VoiceMemosScreen() {
  const { profile } = useAuth();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const { data: memos, isLoading } = useApi<VoiceMemo[]>(
    `/api/voice-memos/couple/${profile?.couple_id}`
  );

  const createMemo = useApiMutation(
    '/api/voice-memos',
    'post',
    {
      invalidateQueries: [`/api/voice-memos/couple/${profile?.couple_id}`],
    }
  );

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to the microphone');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const duration = status.isLoaded ? Math.round((status.durationMillis || 0) / 1000) : 0;

      Alert.prompt(
        'Save Voice Memo',
        'Give your memo a title',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (title) => {
              if (title) {
                saveMemo(title, uri, duration);
              }
            },
          },
        ],
        'plain-text',
        'My Voice Memo'
      );

      sound.unloadAsync();
    }

    setRecording(null);
  };

  const saveMemo = async (title: string, audioUri: string, duration: number) => {
    // TODO: Upload audio to Supabase Storage
    // For now, we'll save with local URI
    createMemo.mutate({
      title,
      audio_url: audioUri,
      duration_seconds: duration,
    });
  };

  const playMemo = async (memo: VoiceMemo) => {
    try {
      if (playingId === memo.id && playingSound) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingId(null);
        return;
      }

      if (playingSound) {
        await playingSound.stopAsync();
        await playingSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: memo.audio_url },
        { shouldPlay: true }
      );

      setPlayingSound(sound);
      setPlayingId(memo.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          setPlayingId(null);
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Failed to play audio', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading voice memos..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Voice Memos</Text>
        <Text style={styles.subtitle}>
          Record and share voice messages with your partner
        </Text>

        <Card style={styles.recordCard}>
          {isRecording ? (
            <>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
              <Button
                title="Stop Recording"
                onPress={stopRecording}
                variant="secondary"
                fullWidth
              />
            </>
          ) : (
            <Button
              title="🎤 Start Recording"
              onPress={startRecording}
              fullWidth
            />
          )}
        </Card>

        {memos && memos.length > 0 && (
          <View style={styles.memosSection}>
            <Text style={styles.sectionTitle}>Your Voice Memos</Text>
            {memos.map((memo) => (
              <Card key={memo.id} style={styles.memoCard}>
                <View style={styles.memoHeader}>
                  <View style={styles.memoInfo}>
                    <Text style={styles.memoTitle}>{memo.title}</Text>
                    <Text style={styles.memoDate}>
                      {new Date(memo.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.memoDuration}>
                    {formatDuration(memo.duration_seconds)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.playButton,
                    playingId === memo.id && styles.playingButton
                  ]}
                  onPress={() => playMemo(memo)}
                >
                  <Text style={styles.playButtonText}>
                    {playingId === memo.id ? '⏸️ Pause' : '▶️ Play'}
                  </Text>
                </TouchableOpacity>

                {memo.ai_sentiment && (
                  <View style={styles.sentimentSection}>
                    <Text style={styles.sentimentLabel}>AI Insights:</Text>
                    <Text style={styles.sentimentText}>
                      {memo.ai_sentiment.summary || 'Processing...'}
                    </Text>
                  </View>
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
  recordCard: { marginBottom: spacing.lg },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  recordingText: { ...typography.h6, color: colors.error },
  memosSection: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
  memoCard: { marginBottom: spacing.md },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  memoInfo: { flex: 1 },
  memoTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.xs },
  memoDate: { ...typography.bodySmall, color: colors.textSecondary },
  memoDuration: { ...typography.h6, color: colors.primary },
  playButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  playingButton: {
    backgroundColor: colors.secondary,
  },
  playButtonText: { ...typography.h6, color: colors.white },
  sentimentSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sentimentLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  sentimentText: { ...typography.body, color: colors.text },
});
