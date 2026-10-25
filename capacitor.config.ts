import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.streakstake.app',
  appName: 'StreakStake',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
