import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';

interface DashboardStats {
  total_couples: number;
  active_this_week: number;
  pending_messages: number;
  recent_checkins: number;
}

export default function TherapistDashboardScreen({ navigation }: any) {
  const { profile } = useAuth();

  const { data: stats, isLoading } = useApi<DashboardStats>(
    `/api/therapist/${profile?.id}/dashboard-stats`
  );

  const quickActions = [
    { title: 'View Couples', icon: '👥', screen: 'CoupleList' },
    { title: 'Generate Code', icon: '🔑', screen: 'InvitationCodes' },
    { title: 'Messages', icon: '💬', screen: 'TherapistMessages' },
    { title: 'Analytics', icon: '📊', action: () => {} },
  ];

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Therapist Dashboard</Text>
        <Text style={styles.greeting}>Welcome back, {profile?.full_name || 'Doctor'}</Text>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_couples || 0}</Text>
            <Text style={styles.statLabel}>Total Couples</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.active_this_week || 0}</Text>
            <Text style={styles.statLabel}>Active This Week</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.recent_checkins || 0}</Text>
            <Text style={styles.statLabel}>Recent Check-Ins</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.pending_messages || 0}</Text>
            <Text style={styles.statLabel}>Unread Messages</Text>
          </Card>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => {
                  if (action.screen) {
                    navigation.navigate(action.screen);
                  } else if (action.action) {
                    action.action();
                  }
                }}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  greeting: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '48%',
    margin: spacing.sm,
    alignItems: 'center',
  },
  statValue: { ...typography.h2, color: colors.primary, marginBottom: spacing.xs },
  statLabel: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  actionsSection: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h5, color: colors.text, marginBottom: spacing.md },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  actionCard: {
    width: '48%',
    margin: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 32, marginBottom: spacing.sm },
  actionTitle: { ...typography.h6, color: colors.text, textAlign: 'center' },
});
