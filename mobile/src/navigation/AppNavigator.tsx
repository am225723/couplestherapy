import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../contexts/AuthContext";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import { usePushNotifications } from "../hooks/usePushNotifications";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import TherapistSignupScreen from "../screens/auth/TherapistSignupScreen";
import CoupleSignupScreen from "../screens/auth/CoupleSignupScreen";

// Main App Navigators
import ClientTabNavigator from "./ClientTabNavigator";
import TherapistTabNavigator from "./TherapistTabNavigator";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { session, profile, loading } = useAuth();

  // Initialize push notifications when user is logged in
  usePushNotifications();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session || !profile ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="TherapistSignup"
            component={TherapistSignupScreen}
          />
          <Stack.Screen name="CoupleSignup" component={CoupleSignupScreen} />
        </Stack.Navigator>
      ) : profile.role === "therapist" ? (
        <TherapistTabNavigator />
      ) : (
        <ClientTabNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
