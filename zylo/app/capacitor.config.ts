import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zylo.finance',
  appName: 'Zylo Finance',
  webDir: 'out',

  // For development: use local dev server
  // Uncomment the server config below and replace with your local IP
  // when running in dev mode with live reload

  // server: {
  //   url: 'http://192.168.1.X:3000',
  //   cleartext: true
  // },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
