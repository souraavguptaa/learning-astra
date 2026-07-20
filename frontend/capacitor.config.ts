import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sastasundar.learningastra',
  appName: 'Learning Astra',
  webDir: 'dist',
  // Points the app shell at the live site instead of bundling a static snapshot, so every
  // web deploy shows up in the app immediately with no APK rebuild/redistribution needed.
  server: {
    url: 'https://learning-astra-frontend.onrender.com',
    androidScheme: 'https',
  },
};

export default config;
