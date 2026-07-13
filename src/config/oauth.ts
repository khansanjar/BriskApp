// Google OAuth client IDs — create these in the Google Cloud Console
// (APIs & Services > Credentials > OAuth 2.0 Client IDs). The *web* client id
// is required because we request an id_token; the iOS/Android ids are
// recommended so each platform validates against its own client.
//
// Also register the redirect URI in the Google Console. With this app's scheme
// (`brisktransfers`) the redirect URI is:
//   brisktransfers://oauth2redirect/  (or the Expo proxy URL while developing)
export const GOOGLE_OAUTH = {
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

// True only once the placeholders above have been replaced with real IDs.
export const isGoogleConfigured = !GOOGLE_OAUTH.webClientId.startsWith('YOUR_');
