import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import { CoupleJournalEntry } from "../../types";
import Button from "../../components/Button";
import Card from "../../components/Card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { colors, spacing, typography } from "../../constants/theme";

export default function CoupleJournalScreen() {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState<
    "private" | "partner" | "therapist"
  >("partner");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const { data: entries, isLoading } = useApi<CoupleJournalEntry[]>(
    `/api/journal/couple/${profile?.couple_id}`,
  );

  const createEntry = useApiMutation("/api/journal/entries", "post", {
    invalidateQueries: [`/api/journal/couple/${profile?.couple_id}`],
    onSuccess: () => {
      Alert.alert("Success", "Journal entry saved!");
      setTitle("");
      setContent("");
      setSelectedImages([]);
      setShowForm(false);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in title and content");
      return;
    }

    createEntry.mutate({
      title: title.trim(),
      content: content.trim(),
      privacy_level: privacyLevel,
      media_urls: selectedImages.length > 0 ? selectedImages : undefined,
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading journal..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Couple Journal</Text>
        <Text style={styles.subtitle}>Document your journey together</Text>

        {!showForm ? (
          <Button
            title="+ New Entry"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
          />
        ) : (
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Give your entry a title..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Thoughts</Text>
              <TextInput
                style={styles.textArea}
                value={content}
                onChangeText={setContent}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Privacy</Text>
              <View style={styles.privacyButtons}>
                <Button
                  title="Private"
                  variant={privacyLevel === "private" ? "primary" : "outline"}
                  onPress={() => setPrivacyLevel("private")}
                  style={styles.privacyButton}
                />
                <Button
                  title="Partner"
                  variant={privacyLevel === "partner" ? "primary" : "outline"}
                  onPress={() => setPrivacyLevel("partner")}
                  style={styles.privacyButton}
                />
                <Button
                  title="Therapist"
                  variant={privacyLevel === "therapist" ? "primary" : "outline"}
                  onPress={() => setPrivacyLevel("therapist")}
                  style={styles.privacyButton}
                />
              </View>
            </View>

            {selectedImages.length > 0 && (
              <View style={styles.imagesPreview}>
                {selectedImages.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={styles.previewImage}
                  />
                ))}
              </View>
            )}

            <Button
              title="📷 Add Photos"
              variant="outline"
              onPress={pickImage}
              style={styles.imageButton}
            />

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowForm(false);
                  setTitle("");
                  setContent("");
                  setSelectedImages([]);
                }}
                style={styles.formButton}
              />
              <Button
                title="Save Entry"
                onPress={handleSubmit}
                disabled={createEntry.isPending}
                style={styles.formButton}
              />
            </View>
          </Card>
        )}

        {entries && entries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>Your Entries</Text>
            {entries.map((entry) => (
              <Card key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.privacyLabel}>
                    {entry.privacy_level === "private" && "🔒 Private"}
                    {entry.privacy_level === "partner" && "👥 Partner"}
                    {entry.privacy_level === "therapist" && "👨‍⚕️ Therapist"}
                  </Text>
                </View>
                <Text style={styles.entryDate}>
                  {new Date(entry.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.entryContent}>{entry.content}</Text>
                {entry.media_urls && entry.media_urls.length > 0 && (
                  <View style={styles.entryImages}>
                    {entry.media_urls.map((url, index) => (
                      <Image
                        key={index}
                        source={{ uri: url }}
                        style={styles.entryImage}
                      />
                    ))}
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  addButton: { marginBottom: spacing.lg },
  formCard: { marginBottom: spacing.lg },
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
    minHeight: 150,
    color: colors.text,
  },
  privacyButtons: { flexDirection: "row", gap: spacing.sm },
  privacyButton: { flex: 1 },
  imagesPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  previewImage: { width: 100, height: 100, borderRadius: 8 },
  imageButton: { marginBottom: spacing.md },
  formButtons: { flexDirection: "row", gap: spacing.sm },
  formButton: { flex: 1 },
  entriesSection: { marginTop: spacing.lg },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  entryCard: { marginBottom: spacing.md },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  entryTitle: { ...typography.h6, color: colors.text, flex: 1 },
  privacyLabel: { ...typography.bodySmall, color: colors.textSecondary },
  entryDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  entryContent: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  entryImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  entryImage: { width: 100, height: 100, borderRadius: 8 },
});
