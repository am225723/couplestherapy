import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, typography } from '../../constants/theme';
import { apiClient } from '../../services/api';

export default function CoupleSignupScreen({ navigation }: any) {
  const [invitationCode, setInvitationCode] = useState('');
  const [partner1Name, setPartner1Name] = useState('');
  const [partner1Email, setPartner1Email] = useState('');
  const [partner1Password, setPartner1Password] = useState('');
  const [partner2Name, setPartner2Name] = useState('');
  const [partner2Email, setPartner2Email] = useState('');
  const [partner2Password, setPartner2Password] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (
      !invitationCode ||
      !partner1Name ||
      !partner1Email ||
      !partner1Password ||
      !partner2Name ||
      !partner2Email ||
      !partner2Password
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (partner1Password.length < 6 || partner2Password.length < 6) {
      Alert.alert('Error', 'Passwords must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/public/register-couple', {
        invitation_code: invitationCode,
        partner1_name: partner1Name,
        partner1_email: partner1Email,
        partner1_password: partner1Password,
        partner2_name: partner2Name,
        partner2_email: partner2Email,
        partner2_password: partner2Password,
      });

      Alert.alert(
        'Success',
        'Couple account created successfully! You can now sign in with your email and password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Couple Signup</Text>
          <Text style={styles.subtitle}>Create your couple account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Invitation Code"
            value={invitationCode}
            onChangeText={setInvitationCode}
            placeholder="Enter invitation code from your therapist"
            autoCapitalize="characters"
          />

          <Text style={styles.sectionTitle}>Partner 1</Text>
          <Input
            label="Full Name"
            value={partner1Name}
            onChangeText={setPartner1Name}
            placeholder="Enter full name"
          />
          <Input
            label="Email"
            value={partner1Email}
            onChangeText={setPartner1Email}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={partner1Password}
            onChangeText={setPartner1Password}
            placeholder="Enter password"
            secureTextEntry
          />

          <Text style={styles.sectionTitle}>Partner 2</Text>
          <Input
            label="Full Name"
            value={partner2Name}
            onChangeText={setPartner2Name}
            placeholder="Enter full name"
          />
          <Input
            label="Email"
            value={partner2Email}
            onChangeText={setPartner2Email}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={partner2Password}
            onChangeText={setPartner2Password}
            placeholder="Enter password"
            secureTextEntry
          />

          <Button
            title="Create Couple Account"
            onPress={handleSignup}
            loading={loading}
            fullWidth
            style={styles.signupButton}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  signupButton: {
    marginTop: spacing.lg,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  linkTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
