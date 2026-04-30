import Constants from 'expo-constants';

export default {
  expo: {
    name: 'Circles',
    slug: 'circles-app',
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
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
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
    owner: 'srikanthsriram',
  },
};
