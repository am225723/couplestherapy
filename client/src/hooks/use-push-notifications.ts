import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

/**
 * Web Push Notifications Hook
 * Registers FCM token and sets up service worker for web PWA
 * Call this hook in your root App component
 */
export function usePushNotifications() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;

    const registerPushNotifications = async () => {
      try {
        // Check if notifications are supported
        if (!("serviceWorker" in navigator) || !("Notification" in window)) {
          console.warn("Push notifications not supported in this browser");
          return;
        }

        // Request notification permission
        if (Notification.permission === "denied") {
          return; // User denied, don't ask again
        }

        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;
        }

        // Register service worker for offline notification handling
        if ("serviceWorker" in navigator) {
          try {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("Service Worker registered for notifications");
          } catch (error) {
            console.warn("Service Worker registration failed:", error);
            // Don't fail if service worker isn't available
          }
        }

        // For web, we'll use a simple registration system
        // In production, integrate with Firebase Cloud Messaging (FCM)
        try {
          const token = await generateSimpleFCMToken();
          if (token) {
            // Register token with backend
            await fetch("/api/push-notifications/register-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                token,
                type: "fcm",
              }),
            });
            console.log("Push token registered successfully");
          }
        } catch (error) {
          console.warn("Failed to register push token:", error);
          // Don't fail - notifications are not critical
        }
      } catch (error) {
        console.warn("Push notification setup failed:", error);
      }
    };

    registerPushNotifications();
  }, [session]);
}

/**
 * Generate a simple FCM token for web
 * In production, use Firebase SDK with proper credentials
 */
async function generateSimpleFCMToken(): Promise<string | null> {
  try {
    // For development, create a simple token based on user + browser
    // In production, use actual Firebase Cloud Messaging
    const browserId = localStorage.getItem("browser-id");
    if (!browserId) {
      const newId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("browser-id", newId);
      return newId;
    }
    return browserId;
  } catch {
    return null;
  }
}
