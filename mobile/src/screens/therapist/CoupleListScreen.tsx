import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

interface Couple {
  id: string;
  partner1_name?: string;
  partner2_name?: string;
  created_at: string;
  last_activity?: string;
}

export default function CoupleListScreen({ navigation }: any) {
  const { profile } = useAuth();

  const { data: couples, isLoading } = useApi<Couple[]>(
    `/api/therapist/${profile?.id}/couples`
  );

  const getDaysSinceActivity = (lastActivity?: string) => {
    if (!lastActivity) return 'No activity';
    const days = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading couples..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>My Couples</Text>
        <Text style={styles.subtitle}>
          {couples?.length || 0} {couples?.length === 1 ? 'couple' : 'couples'} under your care
        </Text>

        {couples && couples.length > 0 ? (
          couples.map((couple) => (
            <TouchableOpacity
              key={couple.id}
              onPress={() => navigation.navigate('CoupleDetail', { coupleId: couple.id })}
            >
              <Card style={styles.coupleCard}>
                <View style={styles.coupleHeader}>
                  <Text style={styles.coupleName}>
                    {couple.partner1_name && couple.partner2_name
                      ? `${couple.partner1_name} & ${couple.partner2_name}`
                      : 'Couple'}
                  </Text>
                  <Text style={styles.coupleId}>#{couple.id.slice(0, 8)}</Text>
                </View>

                <View style={styles.coupleDetails}>
                  <Text style={styles.detailText}>
                    Joined: {new Date(couple.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.detailText}>
                    Last activity: {getDaysSinceActivity(couple.last_activity)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No couples yet. Generate an invitation code to get started.
            </Text>
          </Card>
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
  coupleCard: { marginBottom: spacing.md },
  coupleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  coupleName: { ...typography.h6, color: colors.text, flex: 1 },
  coupleId: { ...typography.bodySmall, color: colors.textSecondary },
  coupleDetails: { marginTop: spacing.xs },
  detailText: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  emptyState: { marginTop: spacing.xl },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
