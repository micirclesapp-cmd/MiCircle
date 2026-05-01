import Constants from 'expo-constants';

export default {
  expo: {
    name: 'Circles',
    slug: 'circleapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.circles.app',
      associatedDomains: ['applinks:circles.app'],
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Circles uses your location to show nearby circles and events.',
      },
    },
    android: {
      package: 'com.circles.app',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'NOTIFICATIONS',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'circles.app',
              pathPrefix: '/open',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    scheme: 'circles',
    plugins: [
      [
        'expo-notifications',
        {
          sounds: [],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'ed6fb5d3-14a6-4d38-a076-05016c4a596c',
      },
      // Firebase Config - sourced from .env
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,

      // External APIs
      giphyApiKey: process.env.GIPHY_API_KEY,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      perspectiveApiKey: process.env.PERSPECTIVE_API_KEY,
    },
    owner: 'micircles',
  },
};
