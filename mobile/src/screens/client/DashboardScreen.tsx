import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";

export default function DashboardScreen({ navigation }: any) {
  const { profile } = useAuth();

  const quickActions = [
    { title: "Weekly Check-In", screen: "WeeklyCheckin" },
    { title: "Love Language Quiz", screen: "LoveLanguageQuiz" },
    {
      title: "Messages",
      screen: "../Communication",
      params: { screen: "MessagesMain" },
    },
    {
      title: "Date Night Ideas",
      screen: "../Activities",
      params: { screen: "DateNight" },
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{profile?.full_name || "User"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => {
                if (action.params) {
                  navigation.navigate(action.screen, action.params);
                } else {
                  navigation.navigate(action.screen);
                }
              }}
            >
              <Text style={styles.cardTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl,
  },
  greeting: { ...typography.body, color: colors.white, opacity: 0.9 },
  name: { ...typography.h2, color: colors.white, fontWeight: "700" },
  section: { padding: spacing.xl },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  card: {
    width: "48%",
    margin: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...typography.h6, color: colors.text },
});
