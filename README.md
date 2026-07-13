# Brisk Transfers — Driver App (Expo SDK 56)

## Run karne ka tarika

```bash
npm install
npx expo start
```

Agar naya project scaffold kar rahe hain (ye files kisi fresh project me daalne ke liye hain):

```bash
npx create-expo-app@latest brisk-transfers-driver --template default@next
cd brisk-transfers-driver
# ab is zip ki files apne project me copy/replace karein (App.tsx, app.json, package.json, src/)
npm install
```

## Folder Structure

```
brisk-app/
 ├─ App.tsx                 ← entry point, push notification handler
 ├─ app.json                ← Expo config (permissions, bundle IDs, SDK plugins)
 ├─ package.json            ← Expo SDK 56 pinned dependencies
 └─ src/
     ├─ api/                ← ek file per backend module (client.ts = shared fetch wrapper)
     ├─ store/               ← Zustand: authStore (session), themeStore (dark mode)
     ├─ theme/               ← colors.ts (light/dark tokens), typography.ts, spacing.ts
     ├─ components/ui/       ← Button, Card, Badge, Input, EmptyState
     ├─ components/booking/  ← BookingCard, StatusTimeline
     ├─ screens/
     │   ├─ auth/            ← Login, Register, ForgotPassword, ResetPassword
     │   ├─ dashboard/       ← DashboardScreen
     │   ├─ bookings/        ← BookingsListScreen, BookingDetailScreen
     │   ├─ notifications/   ← NotificationsScreen
     │   └─ profile/         ← ProfileScreen
     ├─ navigation/          ← RootNavigator (auth/app switch), AuthNavigator, AppTabs
     └─ hooks/               ← usePushToken, useLocationTracking
```

## Assumptions Made
- **Navigation:** React Navigation (native-stack + bottom-tabs) chuna gaya hai, Expo Router nahi — agar file-based routing chahiye to `navigation/` folder ko Expo Router conventions me convert karna hoga.
- **State/data fetching:** Simplicity ke liye local `useState`/`useEffect` + pull-to-refresh use kiya hai, na ke React Query. Agar caching/retry chahiye to har screen ke `load()` function ko `useQuery` se wrap kiya ja sakta hai.
- **Location queue:** `useLocationTracking.ts` me abhi in-memory queue hai (app restart pe queue clear ho jati hai). Production ke liye ise `expo-file-system` ya SQLite se persist karein.
- **Icons:** Is code me koi icon library directly use nahi hui — `@react-native-vector-icons/*` install karke tab bar / buttons me icons add kar sakte hain.
- **Profile photo upload:** `profile_photo` field ek URL leta hai — actual image picker/upload flow (Expo ImagePicker + storage endpoint) is scope se bahar hai, sirf field update wired hai.

## API Base URL
`src/api/client.ts` me `BASE_URL` constant hai — staging/production switch karna ho to isay env variable (`EXPO_PUBLIC_API_URL`) se replace kar dein.

## Next Steps
1. `npm install` karein, phir `npx expo start`.
2. Dev client ya Expo Go (SDK 56 compatible) me test karein.
3. Location aur push notification permissions physical device par test karein (simulator me push kaam nahi karta).
4. Dark mode Profile tab se toggle kar ke sab screens check karein.
