# How to Run Zylo Finance Mobile App

This guide explains how to run your Zylo Finance app on iOS and Android devices using Capacitor.

## Important Note

This app talks to a Midnight proof server, an indexer and the enclave proxy at runtime, so it needs a running server. We use Next.js in **development/server mode** with Capacitor, not static export.

Proving is the constraint on mobile: the heaviest circuit (`claimEarnings`) has a ~10 MB proving key, so point `NEXT_PUBLIC_PROOF_SERVER_URL` at a hosted proof server rather than expecting the device to prove locally. This has not been measured on a real device.

## Prerequisites

### Required Software
- **Node.js 22+** (LTS version)
- **npm** or **bun** package manager
- **Xcode** (for iOS development - macOS only)
  - Download from Mac App Store
  - Install Command Line Tools: `xcode-select --install`
- **Android Studio** (for Android development)
  - Download from: https://developer.android.com/studio
  - Install Android SDK (API level 33+)
  - Set up an Android emulator or connect a physical device

### Check Your Setup
```bash
# Verify Node.js version
node --version  # Should be 22.x or higher

# Verify npm
npm --version

# Verify Capacitor
npx cap --version
```

## Initial Setup

### 1. Install Dependencies
```bash
# Make sure you're using Node.js 22
nvm use 22

# Install Node.js dependencies
npm install
```

### 2. Platforms Already Added!

The iOS and Android platforms have already been added to this project:
- `ios/` - Xcode project for iOS
- `android/` - Android Studio project for Android

If you need to re-add them:
```bash
# iOS (macOS only)
node node_modules/@capacitor/cli/bin/capacitor add ios

# Android
node node_modules/@capacitor/cli/bin/capacitor add android
```

### 3. Get Your Local IP Address

For mobile development with live reload, you need your computer's local IP:

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig | findstr IPv4
```

Example output: `192.168.1.100` (use this IP in the next step)

### 4. Configure Capacitor for Development

Edit `capacitor.config.ts` and uncomment/update the server configuration:

```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:3000',  // Replace with your IP
  cleartext: true
},
```

Example:
```typescript
server: {
  url: 'http://192.168.1.100:3000',
  cleartext: true
},
```

## Running on Devices

### Step 1: Start the Next.js Development Server

```bash
# Terminal 1: Start Next.js dev server
npm run dev
```

**Important:** Keep this terminal running! The mobile app connects to this server.

### Step 2: Sync Capacitor

Whenever you change `capacitor.config.ts`:
```bash
# Sync changes to native projects
node node_modules/@capacitor/cli/bin/capacitor sync
```

### Step 3: Run on iOS (macOS only)

#### Using Xcode (Recommended)
```bash
# Open Xcode project
node node_modules/@capacitor/cli/bin/capacitor open ios
```

Then in Xcode:
1. Select your target device (simulator or physical device)
2. Click the "Play" button or press `Cmd + R`
3. The app will launch and connect to your dev server
4. For physical devices, you'll need an Apple Developer account

**Note:** Make sure your iPhone/iPad is on the same WiFi network as your computer!

### Step 4: Run on Android

#### Using Android Studio (Recommended)
```bash
# Open Android Studio project
node node_modules/@capacitor/cli/bin/capacitor open android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Select your target device (emulator or physical device)
3. Click the "Run" button or press `Shift + F10`
4. The app will launch and connect to your dev server

**Note:** For physical Android devices, enable USB debugging and ensure same WiFi network!

## Updating the App After Code Changes

Every time you make changes to your code, follow these steps:

### For Production Build
```bash
# 1. Rebuild Next.js
npm run build

# 2. Sync changes to native projects
npx cap sync

# 3. Run on device
npx cap run ios
# or
npx cap run android
```

### For Development with Live Reload
```bash
# Just save your changes - Next.js dev server will auto-reload
# The mobile app will refresh automatically
```

## Troubleshooting

### Issue: "Web content not found"
**Solution:** Make sure you've run `npm run build` and the `out/` directory exists.

### Issue: iOS build fails
**Solutions:**
- Update CocoaPods: `sudo gem install cocoapods`
- Run `pod install` in the `ios/App` directory
- Clean build: In Xcode, go to Product > Clean Build Folder

### Issue: Android build fails
**Solutions:**
- Ensure Android SDK is installed and up to date
- Check `android/local.properties` has correct SDK path
- In Android Studio: File > Invalidate Caches and Restart

### Issue: Plugins not working
**Solution:**
```bash
npx cap sync
npx cap copy
```

### Issue: White screen on mobile
**Solutions:**
- Check browser console in Xcode/Android Studio
- Verify `capacitor.config.ts` has correct `webDir: 'out'`
- Make sure Next.js build completed successfully

## Building for Production

### iOS App Store

1. Open Xcode: `npx cap open ios`
2. Select "Any iOS Device (arm64)" as target
3. Go to Product > Archive
4. Follow Apple's App Store submission process
5. You'll need:
   - Apple Developer Program membership ($99/year)
   - App Store Connect account
   - Provisioning profiles and certificates

### Google Play Store

1. Open Android Studio: `npx cap open android`
2. Go to Build > Generate Signed Bundle / APK
3. Create a new keystore (or use existing)
4. Build release APK or AAB
5. Upload to Google Play Console
6. You'll need:
   - Google Play Developer account ($25 one-time)
   - Signed release build
   - App listing details and screenshots

## File Structure

```
app/
├── app/                          # Next.js app directory
│   ├── (app)/                    # Route group
│   │   ├── dashboard/            # Dashboard page
│   │   └── mobile-deposit/       # Mobile deposit page
│   ├── src/
│   │   ├── components/
│   │   │   └── mobile/           # Mobile-specific components
│   │   ├── styles/
│   │   │   └── mobile-neo-brutalist.css
│   │   ├── services/
│   │   │   └── mobileApiService.ts
│   │   └── utils/
│   │       └── platform.ts       # Platform detection
│   └── layout.tsx
├── ios/                          # iOS Xcode project (generated)
├── android/                      # Android Studio project (generated)
├── out/                          # Next.js static export (generated)
├── capacitor.config.ts           # Capacitor configuration
├── next.config.ts               # Next.js configuration
└── HOW_TO_RUN_MOBILE.md         # This file
```

## Mobile-Specific Features

### Platform Detection
The app automatically detects if it's running on native mobile and shows a different UI:

```typescript
import { isMobile } from '@/utils/platform';

if (isMobile()) {
  // Show mobile UI
} else {
  // Show web UI
}
```

### Neo-Brutalist Design Components

The mobile app includes these custom components:
- **MobileDashboard** - Main dashboard with balance card
- **ActionCards** - Withdraw/Deposit cards
- **GaugeWidget** - Monthly limit gauge with progress
- **TransactionList** - Recent transactions with status
- **DepositScreen** - QR code and share link screen
- **BottomTabBar** - Bottom navigation

### API Integration

Update `/app/src/services/mobileApiService.ts` to connect to your backend:

```typescript
// Replace mock functions with real API calls
export async function getUserBalance(address: string) {
  const response = await fetch(`/api/balance?address=${address}`);
  return response.json();
}
```

## Testing on Physical Devices

### iOS Physical Device
1. Connect iPhone/iPad via USB
2. In Xcode, select your device from the device menu
3. Trust your developer certificate on the device
4. Build and run

### Android Physical Device
1. Enable Developer Options on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging in Developer Options
3. Connect via USB
4. Allow USB debugging when prompted
5. Run: `npx cap run android`

## Environment Variables

Make sure to set up your environment variables:

```bash
# .env.local — see app/.env.example for the full list
NEXT_PUBLIC_PROOF_SERVER_URL=http://YOUR_LOCAL_IP:6300
NEXT_PUBLIC_EXCHANGE_ADDRESS=
ENCLAVE_URL=http://127.0.0.1:8088
```

On a device, `localhost` is the phone. Point the proof server and any other host at your
machine's LAN IP, the same way `capacitor.config.ts` points at the dev server.

## Performance Tips

1. **Optimize Images:** Use Next.js Image component
2. **Code Splitting:** Components are automatically split
3. **Bundle Size:** Keep dependencies minimal
4. **Native Features:** Use Capacitor plugins for better performance

## Capacitor Plugins

You can add native functionality:

```bash
# Camera
npm install @capacitor/camera
npx cap sync

# Haptics
npm install @capacitor/haptics
npx cap sync

# Share
npm install @capacitor/share
npx cap sync
```

## Support & Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Ionic Framework:** https://ionicframework.com/ (optional UI components)

## Need Help?

- Check Capacitor CLI: `npx cap doctor`
- View logs in Xcode (iOS) or Logcat (Android)
- Check browser console in dev tools

---

Built with Capacitor + Next.js
