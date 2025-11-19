#!/bin/bash

# Client Screens
cat > mobile/src/screens/client/DashboardScreen.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to ALEIC</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
});
EOF

# Create all other client screens with similar placeholders
for screen in \
  "WeeklyCheckinScreen" "LoveLanguageQuizScreen" "LoveMapQuizScreen" \
  "AttachmentAssessmentScreen" "EnneagramAssessmentScreen" "MessagesScreen" \
  "VoiceMemosScreen" "EchoEmpathyScreen" "HoldMeTightScreen" "PauseButtonScreen" \
  "GratitudeLogScreen" "DateNightScreen" "SharedGoalsScreen" "RitualsScreen" \
  "CoupleJournalScreen" "IFSIntroScreen" "MeditationLibraryScreen" \
  "ValuesVisionScreen" "FourHorsemenScreen" "DemonDialoguesScreen" \
  "IntimacyMappingScreen" "CalendarScreen" "FinancialToolkitScreen" \
  "ParentingPartnersScreen" "ProfileScreen"
do
  screenName=$(echo $screen | sed 's/Screen//')
  cat > "mobile/src/screens/client/${screen}.tsx" << EOF
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export default function ${screen}() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>${screenName}</Text>
        <Text style={styles.subtitle}>Feature coming soon...</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
});
EOF
done

# Create therapist screens
for screen in \
  "TherapistDashboardScreen" "CoupleListScreen" "CoupleDetailScreen" \
  "InvitationCodesScreen" "TherapistMessagesScreen" "TherapistProfileScreen"
do
  screenName=$(echo $screen | sed 's/Screen//' | sed 's/Therapist//')
  cat > "mobile/src/screens/therapist/${screen}.tsx" << EOF
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

export default function ${screen}() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>${screenName}</Text>
        <Text style={styles.subtitle}>Therapist feature coming soon...</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
});
EOF
done

echo "All screens created successfully!"
EOF
chmod +x mobile/create-screens.sh
