
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.openchat.ai',
  appName: 'OpenChat',
  webDir: 'dist',
  
  // Development Server
  server: {
    url: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8080' 
      : undefined,
    cleartext: process.env.NODE_ENV === 'development',
  },
  
  // iOS Configuration
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#ffffff',
  },
  
  // Android Configuration
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#ffffff',
  },
  
  // Plugins
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
