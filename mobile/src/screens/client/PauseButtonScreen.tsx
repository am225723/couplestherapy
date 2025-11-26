import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useApi, useApiMutation } from "../../hooks/useApi";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { colors, spacing, typography } from "../../constants/theme";
import { supabase } from "../../services/supabase";

interface PauseEvent {
  id: number;
  triggered_by: string;
  reason?: string;
  created_at: string;
  resolved_at?: string;
}

export default function PauseButtonScreen() {
  const { profile } = useAuth();
  const [isPaused, setIsPaused] = useState(false);
  const [reason, setReason] = useState("");
  const [pulseAnim] = useState(new Animated.Value(1));

  const { data: currentPause } = useApi<PauseEvent | null>(
    `/api/pause/couple/${profile?.couple_id}/current`,
  );

  const triggerPause = useApiMutation("/api/pause", "post", {
    invalidateQueries: [`/api/pause/couple/${profile?.couple_id}/current`],
    onSuccess: () => {
      Alert.alert(
        "Pause Activated",
        "Take a deep breath. Use this time to calm down before continuing the conversation.",
      );
    },
  });

  const resolvePause = useApiMutation("/api/pause/resolve", "post", {
    invalidateQueries: [`/api/pause/couple/${profile?.couple_id}/current`],
    onSuccess: () => {
      Alert.alert(
        "Ready to Continue",
        "Great job taking a break. Ready to reconnect?",
      );
    },
  });

  // Subscribe to realtime pause events
  useEffect(() => {
    if (!profile?.couple_id) return;

    const channel = supabase
      .channel(`pause:${profile.couple_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Couples_Pause_Events",
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          if (payload.new && !(payload.new as any).resolved_at) {
            setIsPaused(true);
            Alert.alert(
              "⏸️ Pause Requested",
              "Your partner has requested a pause. Take some time to cool down.",
            );
          } else {
            setIsPaused(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.couple_id]);

  // Pulse animation when paused
  useEffect(() => {
    if (isPaused || currentPause) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isPaused, currentPause]);

  const handlePause = () => {
    Alert.alert(
      "Activate Pause?",
      "This will notify your partner that you need a break from the conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pause",
          style: "destructive",
          onPress: () => {
            triggerPause.mutate({ reason: reason || undefined });
          },
        },
      ],
    );
  };

  const handleResume = () => {
    if (currentPause) {
      resolvePause.mutate({ pause_id: currentPause.id });
    }
  };

  const isCurrentlyPaused = currentPause && !currentPause.resolved_at;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pause Button</Text>
        <Text style={styles.subtitle}>
          Use this when you need a break during a difficult conversation
        </Text>

        <Card
          style={[styles.pauseCard, isCurrentlyPaused && styles.pausedCard]}
        >
          {isCurrentlyPaused ? (
            <>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity style={styles.pauseButton} disabled>
                  <Text style={styles.pauseButtonText}>⏸️</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.pausedTitle}>Conversation Paused</Text>
              <Text style={styles.pausedText}>
                {currentPause.triggered_by === profile?.id
                  ? "You requested a pause"
                  : "Your partner requested a pause"}
              </Text>

              {currentPause.reason && (
                <Text style={styles.reasonText}>
                  Reason: {currentPause.reason}
                </Text>
              )}

              <View style={styles.cooldownTips}>
                <Text style={styles.tipsTitle}>While you're paused:</Text>
                <Text style={styles.tipText}>• Take deep breaths</Text>
                <Text style={styles.tipText}>• Drink some water</Text>
                <Text style={styles.tipText}>• Take a short walk</Text>
                <Text style={styles.tipText}>• Write down your feelings</Text>
              </View>

              <Button
                title="Resume Conversation"
                onPress={handleResume}
                variant="primary"
                fullWidth
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handlePause}
              >
                <Text style={styles.pauseButtonText}>⏸️</Text>
              </TouchableOpacity>

              <Text style={styles.instructionTitle}>Press to Pause</Text>
              <Text style={styles.instructionText}>
                When emotions run high, it's okay to take a break. This will
                notify your partner that you need some space to calm down before
                continuing the conversation.
              </Text>

              <Card style={styles.guidelinesCard}>
                <Text style={styles.guidelinesTitle}>
                  When to use the Pause Button:
                </Text>
                <Text style={styles.guidelineText}>
                  • When you feel overwhelmed
                </Text>
                <Text style={styles.guidelineText}>
                  • When you're too angry to listen
                </Text>
                <Text style={styles.guidelineText}>
                  • When the conversation is escalating
                </Text>
                <Text style={styles.guidelineText}>
                  • When you need to collect your thoughts
                </Text>
              </Card>
            </>
          )}
        </Card>
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
  pauseCard: { alignItems: "center", paddingVertical: spacing.xxl },
  pausedCard: { backgroundColor: colors.warning + "20" },
  pauseButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.warning,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pauseButtonText: { fontSize: 48 },
  pausedTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pausedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  reasonText: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
    fontStyle: "italic",
  },
  cooldownTips: { marginBottom: spacing.lg, width: "100%" },
  tipsTitle: { ...typography.h6, color: colors.text, marginBottom: spacing.sm },
  tipText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  instructionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  guidelinesCard: {
    marginTop: spacing.lg,
    width: "100%",
    backgroundColor: colors.background,
  },
  guidelinesTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  guidelineText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
