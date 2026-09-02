const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

module.exports = {
  expo: {
    name: "Brisk Transfers Driver",
    slug: "brisktransfers-driver",
    owner: "brisktransfers",
    scheme: "brisktransfers",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/icon.png",
    updates: {
      url: "https://u.expo.dev/cfca579d-dde5-43a7-af96-77b847178012"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    ios: {
      bundleIdentifier: "com.brisktransfers.driver",
      deploymentTarget: "16.4",
      infoPlist: {
        LSApplicationQueriesSchemes: ['comgooglemaps', 'googlemaps', 'maps'],
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription:
          "Your location is used to provide live tracking and accurate pick-up points for customers while you are active on the app.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Continuous background location access is required to ensure seamless trip tracking and navigation updates for the customer, even when the screen is locked.",
        NSLocationAlwaysUsageDescription:
          "Continuous background location access is required for live trip tracking.",
      },
    },
    android: {
      package: "com.brisktransfers.driver",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: googleApiKey,
        },
      },
      googleServicesFile: "./google-services.json"
    },
    plugins: [
      "expo-font",
      "expo-secure-store",
      "expo-task-manager",
      "expo-notifications",
      "expo-web-browser",
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FFFFFF",
          "image": "./assets/images/splash-icon.png",
          "dark": {
            "image": "./assets/images/icon.png",
            "backgroundColor": "#111111"
          },
          "imageWidth": 200
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Continuous background location access is required to ensure seamless trip tracking and navigation updates.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleApiKey,
          iosGoogleMapsApiKey: googleApiKey,
        },
      ],
    ],
    "extra": {
      "eas": {
        "projectId": "cfca579d-dde5-43a7-af96-77b847178012"
      }
    }
  },
};