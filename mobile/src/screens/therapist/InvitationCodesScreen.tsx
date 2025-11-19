import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share, Clipboard } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

interface InvitationCode {
  id: number;
  code: string;
  is_used: boolean;
  used_by_couple_id?: string;
  created_at: string;
  expires_at?: string;
}

export default function InvitationCodesScreen() {
  const { profile } = useAuth();

  const { data: codes, isLoading } = useApi<InvitationCode[]>(
    `/api/therapist/${profile?.id}/invitation-codes`
  );

  const generateCode = useApiMutation(
    '/api/therapist/invitation-codes',
    'post',
    {
      invalidateQueries: [`/api/therapist/${profile?.id}/invitation-codes`],
      onSuccess: (data) => {
        Alert.alert(
          'Code Generated!',
          `Invitation code: ${data.code}`,
          [
            { text: 'Copy', onPress: () => copyToClipboard(data.code) },
            { text: 'Share', onPress: () => shareCode(data.code) },
            { text: 'OK' },
          ]
        );
      },
    }
  );

  const copyToClipboard = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', 'Invitation code copied to clipboard');
  };

  const shareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Join ALEIC couples therapy with invitation code: ${code}`,
      });
    } catch (error) {
      console.error('Error sharing code', error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading invitation codes..." />;
  }

  const activeCodes = codes?.filter(c => !c.is_used) || [];
  const usedCodes = codes?.filter(c => c.is_used) || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Invitation Codes</Text>
        <Text style={styles.subtitle}>
          Generate codes for new couples to join your practice
        </Text>

        <Button
          title="+ Generate New Code"
          onPress={() => generateCode.mutate({})}
          disabled={generateCode.isPending}
          style={styles.generateButton}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Codes</Text>
          {activeCodes.length > 0 ? (
            activeCodes.map((code) => (
              <Card key={code.id} style={styles.codeCard}>
                <View style={styles.codeHeader}>
                  <Text style={styles.codeText}>{code.code}</Text>
                  <View style={styles.codeActions}>
                    <Button
                      title="Copy"
                      variant="outline"
                      onPress={() => copyToClipboard(code.code)}
                      style={styles.codeButton}
                    />
                    <Button
                      title="Share"
                      variant="primary"
                      onPress={() => shareCode(code.code)}
                      style={styles.codeButton}
                    />
                  </View>
                </View>
                <Text style={styles.codeDate}>
                  Created: {new Date(code.created_at).toLocaleDateString()}
                </Text>
              </Card>
            ))
          ) : (
            <Card>
              <Text style={styles.emptyText}>No active codes. Generate one to get started!</Text>
            </Card>
          )}
        </View>

        {usedCodes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Used Codes</Text>
            {usedCodes.map((code) => (
              <Card key={code.id} style={styles.usedCodeCard}>
                <Text style={styles.codeText}>{code.code}</Text>
                <Text style={styles.usedText}>✓ Used</Text>
                <Text style={styles.codeDate}>
                  Created: {new Date(code.created_at).toLocaleDateString()}
                </Text>
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
  generateButton: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.md },
  codeCard: { marginBottom: spacing.md },
  codeHeader: { marginBottom: spacing.sm },
  codeText: {
    ...typography.h4,
    color: colors.primary,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  codeActions: { flexDirection: 'row', gap: spacing.sm },
  codeButton: { flex: 1 },
  codeDate: { ...typography.bodySmall, color: colors.textSecondary },
  usedCodeCard: { marginBottom: spacing.md, opacity: 0.6 },
  usedText: { ...typography.bodySmall, color: colors.success, marginBottom: spacing.xs },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
