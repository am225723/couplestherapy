import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { Message } from '../../types';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, typography } from '../../constants/theme';
import { supabase } from '../../services/supabase';

export default function MessagesScreen() {
  const { profile } = useAuth();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, isLoading, refetch } = useApi<Message[]>(
    `/api/messages/couple/${profile?.couple_id}`
  );

  const sendMessage = useApiMutation(
    '/api/messages',
    'post',
    {
      invalidateQueries: [`/api/messages/couple/${profile?.couple_id}`],
      onSuccess: () => {
        setMessageText('');
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    }
  );

  // Subscribe to realtime messages
  useEffect(() => {
    if (!profile?.couple_id) return;

    const channel = supabase
      .channel(`messages:${profile.couple_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Couples_Messages',
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.couple_id]);

  const handleSend = () => {
    if (!messageText.trim()) return;

    sendMessage.mutate({
      content: messageText.trim(),
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === profile?.id;

    return (
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.partnerMessage
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.partnerMessageText
        ]}>
          {item.content}
        </Text>
        <Text style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.partnerMessageTime
        ]}>
          {new Date(item.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
        />
        <Button
          title="Send"
          onPress={handleSend}
          disabled={!messageText.trim() || sendMessage.isPending}
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesList: {
    padding: spacing.md,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  partnerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  ownMessageText: {
    color: colors.white,
  },
  partnerMessageText: {
    color: colors.text,
  },
  messageTime: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  ownMessageTime: {
    color: colors.white,
    opacity: 0.8,
  },
  partnerMessageTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    color: colors.text,
  },
  sendButton: {
    paddingHorizontal: spacing.lg,
  },
});
