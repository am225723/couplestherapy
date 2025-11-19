# ALEIC Mobile App

This is the React Native mobile application for ALEIC (Assisted Learning for Empathetic and Insightful Couples), built with Expo.

## Prerequisites

- Node.js (v18 or higher)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

## Getting Started

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `mobile` directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on a device/simulator:**
   - **iOS:** Press `i` in the terminal or run `npm run ios`
   - **Android:** Press `a` in the terminal or run `npm run android`
   - **Web:** Press `w` in the terminal or run `npm run web`
   - **Physical Device:** Scan the QR code with the Expo Go app

## Project Structure

```
mobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── constants/       # Theme, colors, config
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   │   ├── auth/       # Authentication screens
│   │   ├── client/     # Client (couple) screens
│   │   └── therapist/  # Therapist screens
│   ├── services/        # API clients, Supabase
│   └── types/          # TypeScript types
├── assets/             # Images, fonts, icons
├── App.tsx            # Main app component
├── app.json           # Expo configuration
└── package.json       # Dependencies

```

## Features

### Client App
- Authentication (Login, Signup)
- Weekly Check-Ins
- Love Language Quiz
- Love Map Quiz
- Attachment & Enneagram Assessments
- Communication Tools (Messages, Voice Memos, Echo & Empathy)
- Gratitude Log with image upload
- Date Night Generator (AI-powered)
- Shared Goals & Rituals
- Calendar & Planning Tools
- Personal Growth (IFS, Meditation, Values & Vision)

### Therapist App
- Dashboard with analytics
- Couple management
- Invitation code generation
- Messages with clients
- Access to couple data and progress

## Backend Integration

The mobile app connects to the same Express.js backend as the web app, using:
- **Supabase** for authentication and database
- **REST API** for all data operations
- **Supabase Realtime** for live updates

## Building for Production

### iOS
1. Configure app.json with your bundle identifier
2. Run `eas build --platform ios`
3. Submit to App Store: `eas submit --platform ios`

### Android
1. Configure app.json with your package name
2. Run `eas build --platform android`
3. Submit to Play Store: `eas submit --platform android`

## Environment Configuration

The app supports three environments:
- **Development:** Local API (localhost:5000)
- **Staging:** Staging API URL
- **Production:** Production API URL

Configure these in `src/constants/config.ts`.

## Technology Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **TanStack Query** - Data fetching & caching
- **Supabase** - Backend services
- **Expo AV** - Audio recording/playback
- **Expo Image Picker** - Camera & photo library access
- **Expo Notifications** - Push notifications

## Troubleshooting

### "Unable to resolve module"
Run `npm install` and restart the Metro bundler.

### Icons not showing
Make sure react-native-vector-icons is properly linked. Restart the app.

### Authentication issues
Check that environment variables are set correctly and the backend is running.

## Contributing

This mobile app shares the backend with the web application. Any backend changes will affect both platforms.
