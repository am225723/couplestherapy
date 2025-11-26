import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "../constants/theme";

// Dashboard
import DashboardScreen from "../screens/client/DashboardScreen";

// Assessment Screens
import WeeklyCheckinScreen from "../screens/client/WeeklyCheckinScreen";
import LoveLanguageQuizScreen from "../screens/client/LoveLanguageQuizScreen";
import LoveMapQuizScreen from "../screens/client/LoveMapQuizScreen";
import AttachmentAssessmentScreen from "../screens/client/AttachmentAssessmentScreen";
import EnneagramAssessmentScreen from "../screens/client/EnneagramAssessmentScreen";

// Communication Tools
import MessagesScreen from "../screens/client/MessagesScreen";
import VoiceMemosScreen from "../screens/client/VoiceMemosScreen";
import EchoEmpathyScreen from "../screens/client/EchoEmpathyScreen";
import HoldMeTightScreen from "../screens/client/HoldMeTightScreen";
import PauseButtonScreen from "../screens/client/PauseButtonScreen";

// Connection & Activities
import GratitudeLogScreen from "../screens/client/GratitudeLogScreen";
import DateNightScreen from "../screens/client/DateNightScreen";
import SharedGoalsScreen from "../screens/client/SharedGoalsScreen";
import RitualsScreen from "../screens/client/RitualsScreen";
import CoupleJournalScreen from "../screens/client/CoupleJournalScreen";

// Personal Growth
import IFSIntroScreen from "../screens/client/IFSIntroScreen";
import MeditationLibraryScreen from "../screens/client/MeditationLibraryScreen";
import ValuesVisionScreen from "../screens/client/ValuesVisionScreen";

// Tracking Tools
import FourHorsemenScreen from "../screens/client/FourHorsemenScreen";
import DemonDialoguesScreen from "../screens/client/DemonDialoguesScreen";
import IntimacyMappingScreen from "../screens/client/IntimacyMappingScreen";

// Planning
import CalendarScreen from "../screens/client/CalendarScreen";
import FinancialToolkitScreen from "../screens/client/FinancialToolkitScreen";
import ParentingPartnersScreen from "../screens/client/ParentingPartnersScreen";

// Profile & Settings
import ProfileScreen from "../screens/client/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{ headerTitle: "Home" }}
      />
      <Stack.Screen
        name="WeeklyCheckin"
        component={WeeklyCheckinScreen}
        options={{ headerTitle: "Weekly Check-In" }}
      />
      <Stack.Screen
        name="LoveLanguageQuiz"
        component={LoveLanguageQuizScreen}
        options={{ headerTitle: "Love Language Quiz" }}
      />
      <Stack.Screen
        name="LoveMapQuiz"
        component={LoveMapQuizScreen}
        options={{ headerTitle: "Love Map Quiz" }}
      />
      <Stack.Screen
        name="AttachmentAssessment"
        component={AttachmentAssessmentScreen}
        options={{ headerTitle: "Attachment Assessment" }}
      />
      <Stack.Screen
        name="EnneagramAssessment"
        component={EnneagramAssessmentScreen}
        options={{ headerTitle: "Enneagram Assessment" }}
      />
      <Stack.Screen
        name="FourHorsemen"
        component={FourHorsemenScreen}
        options={{ headerTitle: "Four Horsemen Tracker" }}
      />
      <Stack.Screen
        name="DemonDialogues"
        component={DemonDialoguesScreen}
        options={{ headerTitle: "Demon Dialogues" }}
      />
    </Stack.Navigator>
  );
}

function CommunicationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MessagesMain"
        component={MessagesScreen}
        options={{ headerTitle: "Messages" }}
      />
      <Stack.Screen
        name="VoiceMemos"
        component={VoiceMemosScreen}
        options={{ headerTitle: "Voice Memos" }}
      />
      <Stack.Screen
        name="EchoEmpathy"
        component={EchoEmpathyScreen}
        options={{ headerTitle: "Echo & Empathy" }}
      />
      <Stack.Screen
        name="HoldMeTight"
        component={HoldMeTightScreen}
        options={{ headerTitle: "Hold Me Tight" }}
      />
      <Stack.Screen
        name="PauseButton"
        component={PauseButtonScreen}
        options={{ headerTitle: "Pause Button" }}
      />
    </Stack.Navigator>
  );
}

function ActivitiesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GratitudeLog"
        component={GratitudeLogScreen}
        options={{ headerTitle: "Gratitude Log" }}
      />
      <Stack.Screen
        name="DateNight"
        component={DateNightScreen}
        options={{ headerTitle: "Date Night Ideas" }}
      />
      <Stack.Screen
        name="SharedGoals"
        component={SharedGoalsScreen}
        options={{ headerTitle: "Shared Goals" }}
      />
      <Stack.Screen
        name="Rituals"
        component={RitualsScreen}
        options={{ headerTitle: "Rituals of Connection" }}
      />
      <Stack.Screen
        name="CoupleJournal"
        component={CoupleJournalScreen}
        options={{ headerTitle: "Couple Journal" }}
      />
      <Stack.Screen
        name="IFSIntro"
        component={IFSIntroScreen}
        options={{ headerTitle: "IFS Introduction" }}
      />
      <Stack.Screen
        name="MeditationLibrary"
        component={MeditationLibraryScreen}
        options={{ headerTitle: "Meditation Library" }}
      />
      <Stack.Screen
        name="ValuesVision"
        component={ValuesVisionScreen}
        options={{ headerTitle: "Values & Vision" }}
      />
      <Stack.Screen
        name="IntimacyMapping"
        component={IntimacyMappingScreen}
        options={{ headerTitle: "Intimacy Mapping" }}
      />
    </Stack.Navigator>
  );
}

function PlanningStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{ headerTitle: "Calendar" }}
      />
      <Stack.Screen
        name="FinancialToolkit"
        component={FinancialToolkitScreen}
        options={{ headerTitle: "Financial Toolkit" }}
      />
      <Stack.Screen
        name="ParentingPartners"
        component={ParentingPartnersScreen}
        options={{ headerTitle: "Parenting as Partners" }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerTitle: "Profile" }}
      />
    </Stack.Navigator>
  );
}

export default function ClientTabNavigator() {
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
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Communication"
        component={CommunicationStack}
        options={{
          tabBarLabel: "Connect",
          tabBarIcon: ({ color, size }) => (
            <Icon name="message-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activities"
        component={ActivitiesStack}
        options={{
          tabBarLabel: "Activities",
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Planning"
        component={PlanningStack}
        options={{
          tabBarLabel: "Plan",
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar" size={size} color={color} />
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
