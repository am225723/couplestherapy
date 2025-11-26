# ALEIC Mobile App - Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on physical device (optional)

### Installation

```bash
cd mobile
npm install
```

### Running the App

#### Development Mode

```bash
npx expo start
```

Then:

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go for physical device

#### Production Build

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## 🔧 Configuration

### Environment Variables

Create `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend Connection

The mobile app connects to the same Express.js backend as the web app. Make sure:

1. Backend is running and accessible
2. CORS is configured to allow mobile requests
3. API routes match expectations (see `/api/*` endpoints)

## 📱 Building for App Stores

### iOS (Apple App Store)

1. **Configure app.json**:

   ```json
   {
     "ios": {
       "bundleIdentifier": "com.aleic.therapy",
       "buildNumber": "1.0.0"
     }
   }
   ```

2. **Build**:

   ```bash
   npx expo build:ios
   ```

3. **Submit**: Use Expo's submission service or Xcode

### Android (Google Play)

1. **Configure app.json**:

   ```json
   {
     "android": {
       "package": "com.aleic.therapy",
       "versionCode": 1
     }
   }
   ```

2. **Build**:

   ```bash
   npx expo build:android
   ```

3. **Submit**: Use Expo's submission service or Android Studio

## 🔐 Security

### API Authentication

- JWT tokens stored in Expo SecureStore
- Auto-refresh on app launch
- Logout clears all stored credentials

### Data Privacy

- Three privacy levels: Private, Partner, Therapist
- Row-level security enforced on backend
- End-to-end encryption ready for messages

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**

- [ ] Login with email/password
- [ ] Therapist signup
- [ ] Couple signup with invitation code
- [ ] Session persistence after app close
- [ ] Logout

**Client Features:**

- [ ] Weekly Check-In submission
- [ ] Love Language Quiz completion
- [ ] Gratitude Log with photo upload
- [ ] Send/receive realtime messages
- [ ] Record and play voice memos
- [ ] Create and move shared goals
- [ ] Generate AI date night ideas
- [ ] Create rituals and mark complete
- [ ] Add calendar events
- [ ] Journal entry with photos
- [ ] Pause button activation/resolution
- [ ] Profile editing

**Therapist Features:**

- [ ] View dashboard stats
- [ ] Browse couple list
- [ ] Generate invitation codes
- [ ] Copy/share codes

### Automated Testing

```bash
# Unit tests (when added)
npm test

# E2E tests (when configured)
npm run e2e
```

## 📊 Monitoring & Analytics

### Error Tracking

- Use Sentry for crash reporting
- Configure in `App.tsx`

### Analytics

- Use Expo Analytics or custom solution
- Track screen views, feature usage

## 🔄 Updates

### Over-the-Air (OTA) Updates

```bash
npx expo publish
```

Users receive updates automatically without App Store review (for JS changes only).

### Native Updates

For changes requiring native code:

1. Increment version in `app.json`
2. Rebuild binary
3. Submit to app stores

## 🐛 Troubleshooting

### Common Issues

**"Network request failed"**

- Check backend URL in `.env`
- Verify backend is running
- Check network connectivity

**"Unable to resolve module"**

- Run `npm install` again
- Clear cache: `npx expo start -c`

**Images not uploading**

- Implement Supabase Storage upload
- Check permissions in `app.json`

**Audio not recording**

- Check microphone permissions
- Test on physical device (simulators have limitations)

### Debug Mode

```bash
# With React DevTools
npx expo start --devClient

# With network inspector
npx expo start --tunnel
```

## 📝 Notes

### Limitations

- Some screens are placeholders (see FEATURES_IMPLEMENTED.md)
- Image/audio uploads need Supabase Storage integration
- Push notifications not configured yet

### Performance

- Use `react-native-performance` for monitoring
- Enable Hermes engine for better performance
- Optimize images with `expo-image`

### Accessibility

- Test with VoiceOver (iOS) and TalkBack (Android)
- Ensure proper labels on interactive elements
- Support dynamic font sizes

## 🆘 Support

### Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Supabase Mobile Docs](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)

### Getting Help

- Check GitHub Issues
- Expo Discord community
- StackOverflow with `expo` tag
