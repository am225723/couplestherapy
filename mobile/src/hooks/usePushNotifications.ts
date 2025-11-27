import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useAuth } from "@/lib/auth-context";

/**
 * Mobile Push Notifications Hook (Expo)
 * Requests permission, gets Expo push token, and registers with backend
 * Call this hook in your root navigation component
 */
export function usePushNotifications() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;

    registerForPushNotifications();
  }, [session]);
}

/**
 * Register device for push notifications
 */
async function registerForPushNotifications() {
  try {
    // Only works on physical devices
    if (!Device.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return;
    }

    // Request notification permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("User denied notification permissions");
      return;
    }

    // Get push token from Expo
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoToken = tokenData.data;

    if (!expoToken) {
      console.warn("Failed to get Expo push token");
      return;
    }

    // Register token with backend
    const session = await getSessionToken();
    if (!session) {
      console.warn("No session token available");
      return;
    }

    const backendUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const response = await fetch(
      `${backendUrl}/api/push-notifications/register-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({
          token: expoToken,
          type: "expo",
        }),
      },
    );

    if (!response.ok) {
      console.error("Failed to register push token:", await response.text());
      return;
    }

    console.log("Push token registered successfully");

    // Set notification handler for when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.error("Error setting up push notifications:", error);
  }
}

/**
 * Get session token from Supabase auth
 */
async function getSessionToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error("Failed to get session token:", error);
    return null;
  }
}
