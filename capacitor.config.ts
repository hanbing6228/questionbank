import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jiuxiao.questionbank',
  appName: 'CFA刷题通关',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0d1117',
    scheme: 'QuestionBank',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1400,
      backgroundColor: '#0d1117',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0d1117',
    },
  },
};

export default config;
