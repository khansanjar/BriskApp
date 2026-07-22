// app.config.js

const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

module.exports = {
  expo: {
    name: "Brisk Transfers Driver",
    slug: "brisktransfers-driver",
    scheme: "brisktransfers",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.brisktransfers.driver",
      deploymentTarget: "16.4",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Your location is used to provide live tracking and accurate pick-up points for customers while you are active on the app.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Continuous background location access is required to ensure seamless trip tracking and navigation updates for the customer, even when the screen is locked.",
      },
    },
    android: {
      package: "com.brisktransfers.driver",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: googleApiKey,
        },
      },
    },
    plugins: [
      "expo-secure-store",
      "expo-location",
      "expo-notifications",
      "expo-web-browser",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleApiKey,
          iosGoogleMapsApiKey: googleApiKey,
        },
      ],
    ],
  },
};