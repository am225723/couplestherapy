import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "../constants/theme";

// Therapist Screens
import TherapistDashboardScreen from "../screens/therapist/TherapistDashboardScreen";
import CoupleListScreen from "../screens/therapist/CoupleListScreen";
import CoupleDetailScreen from "../screens/therapist/CoupleDetailScreen";
import InvitationCodesScreen from "../screens/therapist/InvitationCodesScreen";
import TherapistMessagesScreen from "../screens/therapist/TherapistMessagesScreen";
import TherapistProfileScreen from "../screens/therapist/TherapistProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TherapistDashboardMain"
        component={TherapistDashboardScreen}
        options={{ headerTitle: "Dashboard" }}
      />
    </Stack.Navigator>
  );
}

function CouplesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CoupleList"
        component={CoupleListScreen}
        options={{ headerTitle: "My Couples" }}
      />
      <Stack.Screen
        name="CoupleDetail"
        component={CoupleDetailScreen}
        options={{ headerTitle: "Couple Details" }}
      />
    </Stack.Navigator>
  );
}

function ManageStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InvitationCodes"
        component={InvitationCodesScreen}
        options={{ headerTitle: "Invitation Codes" }}
      />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TherapistMessagesMain"
        component={TherapistMessagesScreen}
        options={{ headerTitle: "Messages" }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TherapistProfileMain"
        component={TherapistProfileScreen}
        options={{ headerTitle: "Profile" }}
      />
    </Stack.Navigator>
  );
}

export default function TherapistTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Couples"
        component={CouplesStack}
        options={{
          tabBarLabel: "Couples",
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Manage"
        component={ManageStack}
        options={{
          tabBarLabel: "Manage",
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Icon name="message-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
