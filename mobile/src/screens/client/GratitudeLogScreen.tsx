import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image, Alert, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { GratitudeEntry } from '../../types';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

export default function GratitudeLogScreen() {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: entries, isLoading } = useApi<GratitudeEntry[]>(
    `/api/gratitude/couple/${profile?.couple_id}`
  );

  const createEntry = useApiMutation(
    '/api/gratitude',
    'post',
    {
      invalidateQueries: [`/api/gratitude/couple/${profile?.couple_id}`],
      onSuccess: () => {
        Alert.alert('Success', 'Gratitude entry added!');
        setContent('');
        setSelectedImage(null);
      },
    }
  );

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write what you're grateful for');
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      // TODO: Upload image to Supabase Storage
      // For now, we'll just pass the local URI
      imageUrl = selectedImage;
    }

    createEntry.mutate({
      content: content.trim(),
      image_url: imageUrl,
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading gratitude entries..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Gratitude Log</Text>
        <Text style={styles.subtitle}>
          What are you grateful for today?
        </Text>

        <Card style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I'm grateful for...</Text>
            <TextInput
              style={styles.textArea}
              value={content}
              onChangeText={setContent}
              placeholder="Share something you're grateful for..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.imageButtons}>
            <Button
              title="📷 Take Photo"
              variant="outline"
              onPress={takePicture}
              style={styles.imageButton}
            />
            <Button
              title="🖼️ Choose Photo"
              variant="outline"
              onPress={pickImage}
              style={styles.imageButton}
            />
          </View>

          <Button
            title="Add Entry"
            onPress={handleSubmit}
            fullWidth
            disabled={createEntry.isPending}
          />
        </Card>

        {entries && entries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            {entries.map((entry) => (
              <Card key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.userName}>{entry.user_name || 'You'}</Text>
                  <Text style={styles.entryDate}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.entryContent}>{entry.content}</Text>
                {entry.image_url && (
                  <Image
                    source={{ uri: entry.image_url }}
                    style={styles.entryImage}
                    resizeMode="cover"
                  />
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
  formCard: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
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
  imagePreview: { marginBottom: spacing.md },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  removeImageButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  removeImageText: { ...typography.body, color: colors.error },
  imageButtons: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },
  imageButton: { flex: 1 },
  entriesSection: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
  entryCard: { marginBottom: spacing.md },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  userName: { ...typography.h6, color: colors.text },
  entryDate: { ...typography.bodySmall, color: colors.textSecondary },
  entryContent: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  entryImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
});
