import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jiuxiao.questionbank',
  appName: '刷题本',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f1419',
    scheme: 'QuestionBank',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1400,
      backgroundColor: '#0f1419',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f1419',
    },
  },
};

export default config;
