# Plan: iOS Google Maps deep-link ("Unable to open Google Maps") fix

## Goal

Make the in-app "Navigate" button open Google Maps (or fall back to Apple Maps / browser) reliably on iOS devices, eliminating the "Unable to open Google Maps. Please ensure it is installed or try again." alert.

## Root cause analysis

`src/lib/navigation.ts:18-62` (`openGoogleMapsNavigation`) builds a `comgooglemaps://` URL on iOS and calls `Linking.canOpenURL(url)` before opening it. **iOS only returns `true` from `canOpenURL` for URL schemes that are explicitly whitelisted in the app's `Info.plist` under `LSApplicationQueriesSchemes`.** `app.config.js:19-31` declares the iOS `infoPlist` with location permissions and `UIBackgroundModes`, but it does **not** include `LSApplicationQueriesSchemes`. Result: `canOpenURL('comgooglemaps://')` returns `false`, the code falls through to the browser URL — and the browser fallback is fragile (Apple's `google.com/maps/dir/?api=1&…` URL sometimes redirects or fails silently on the WebKit sheet). From the user's perspective the deep-link "doesn't work" and the alert is shown.

Secondary contributors (worth fixing while we're here):

1. **Coordinate validation is silent.** `openGoogleMapsNavigation` rejects `lat === 0 || lng === 0` and returns `false`, but the caller in `ActiveRideScreen.tsx:282-294` then shows the generic alert. Many bookings come from the API without `pickup_latitude`/`dropoff_latitude` (they're populated by `useBookingCoordinates` asynchronously via geocoding), so the user can hit "Navigate" before coords resolve.
2. **No Apple Maps fallback.** On iOS, if Google Maps isn't installed, the natural fallback is `maps://?daddr=…` (Apple Maps). The current code only tries `comgooglemaps://` then `https://www.google.com/maps/dir/…`, which opens in an in-app browser sheet — not what drivers expect.
3. **Alert is shown even on partial success.** If the URL opened successfully but `canOpenURL` returned false for any reason, the user still sees the error alert if there's any thrown error inside `openURL`.

## Affected files

- `app.config.js` — add `LSApplicationQueriesSchemes` to the iOS `infoPlist`.
- `src/lib/navigation.ts` — fix coordinate validation, add Apple Maps fallback, improve error handling.
- `src/components/ActiveRideScreen.tsx` — pass only validated coords, surface a clearer message when coords aren't ready.
- No backend changes required.

## Implementation steps

1. **Whitelist URL schemes on iOS** in `app.config.js` under `ios.infoPlist`:
   ```js
   LSApplicationQueriesSchemes: ['comgooglemaps', 'googlemaps', 'maps']
   ```
   `maps://` is needed to probe Apple Maps. (`googlemaps://` is the legacy alias and harmless to include.)

2. **Make `openGoogleMapsNavigation` more robust** in `src/lib/navigation.ts`:
   - Accept `{ latitude, longitude, address }` only when **both** lat and lng are finite, non-zero numbers; otherwise return `{ success: false, reason: 'no_coords' }` (or keep boolean return and add a sibling code path — see Open question below).
   - Try the platform-specific native scheme first; on `canOpenURL === false`, fall back to Apple Maps on iOS (`maps://?daddr=lat,lng`) before the browser URL.
   - Wrap the final `Linking.openURL` in `try/catch` so a thrown error returns `false` with a console warning rather than crashing.

3. **Add `openAppleMapsNavigation(destination, mode='d')`** in `src/lib/navigation.ts` for explicit iOS use:
   ```js
   const url = `maps://?daddr=${lat},${lng}&dirflg=d`;
   ```

4. **Update `openNavigationForRide`** to return `{ success: boolean; opened: 'google' | 'apple' | 'browser' | 'none' }` (or split into separate functions) so the caller can choose an appropriate message:
   - `google` / `apple` → no alert.
   - `browser` → no alert (in-app browser opens, user sees the route).
   - `none` (no coords yet) → friendly "Coordinates are still loading — try again in a moment" alert.

5. **In `ActiveRideScreen.tsx`** (`handleNavigationPress`, ~line 277):
   - Don't call navigation if `pickupCoords`/`dropoffCoords` are null.
   - Differentiate the alert text by failure reason ("Coordinates not ready" vs "No maps app available" vs generic).

6. **Guard the coordinate sources.** In `useBookingCoordinates` (`src/hooks/use-booking-coordinates.ts:77-150`), expose an `isReady` boolean alongside `{ pickup, dropoff }` so the UI can disable the Navigate button until both points have resolved (either from API lat/lng or from a successful geocode). Today `RideMap` works fine with one coord missing, but the Navigate button demands both.

7. **Validation** (after implementation, run on a real iOS device):
   - Cold-launch app, open a booking with API-provided coords → press Navigate → Google Maps opens with driving directions.
   - Open a booking whose coords only resolve after geocoding → wait until the map shows the pickup pin, then press Navigate → Google Maps opens.
   - Uninstall Google Maps on the device → press Navigate → Apple Maps opens with the destination.
   - Disable both (offline simulator) → press Navigate → in-app browser opens `https://www.google.com/maps/dir/?…` with no thrown exception.

## Risks

- Adding `LSApplicationQueriesSchemes` requires a fresh iOS build (prebuild + `eas build`). It cannot be tested with `expo start` alone.
- Apple Maps URL scheme `maps://` may prompt the user the first time the app uses it.
- Returning richer result objects is a small API break for any future caller; currently only `ActiveRideScreen` consumes `openNavigationForRide`.

## Out of scope

- Reworking the `useBookingCoordinates` cache to be persistent (still in-memory only).
- Replacing the in-app `react-native-maps` Google Maps view with Apple Maps (the deep-link is the user-facing issue).
- Backend changes — none needed.