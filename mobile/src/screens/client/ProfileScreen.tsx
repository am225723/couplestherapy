import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../constants/theme';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');

  const updateProfile = useApiMutation(
    '/api/profile',
    'put',
    {
      onSuccess: () => {
        Alert.alert('Success', 'Profile updated!');
        refreshProfile();
        setIsEditing(false);
      },
    }
  );

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    updateProfile.mutate({
      full_name: fullName.trim(),
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        
        <Card style={styles.infoCard}>
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setIsEditing(false);
                    setFullName(profile?.full_name || '');
                  }}
                  style={styles.formButton}
                />
                <Button
                  title="Save"
                  onPress={handleSave}
                  disabled={updateProfile.isPending}
                  style={styles.formButton}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{profile?.full_name || 'Not set'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile?.email || 'N/A'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>
                  {profile?.role === 'client' ? 'Couple Member' : 'Therapist'}
                </Text>
              </View>

              {profile?.couple_id && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Couple ID</Text>
                  <Text style={styles.infoValue}>{profile.couple_id}</Text>
                </View>
              )}

              <Button
                title="Edit Profile"
                variant="outline"
                onPress={() => setIsEditing(true)}
                fullWidth
                style={styles.editButton}
              />
            </>
          )}
        </Card>

        <Card style={styles.preferencesCard}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <Text style={styles.comingSoon}>Notification settings and preferences coming soon...</Text>
        </Card>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          fullWidth
          style={styles.signOutButton}
        />

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  infoRow: { marginBottom: spacing.md },
  infoLabel: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  infoValue: { ...typography.body, color: colors.text, fontWeight: '600' },
  editButton: { marginTop: spacing.md },
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
  formButtons: { flexDirection: 'row', gap: spacing.sm },
  formButton: { flex: 1 },
  preferencesCard: { marginBottom: spacing.lg },
  cardTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.sm },
  comingSoon: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  signOutButton: { marginTop: spacing.lg },
  version: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
