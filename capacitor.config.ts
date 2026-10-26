export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
  };
  plugins?: Record<string, unknown>;
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
  };
}

const config: CapacitorConfig = {
  appId: 'in.kavachcampus.app',
  appName: 'Kavach Campus',
  webDir: '.next/standalone/public',
  server: {
    // In staging/production, point to the live Vercel HTTPS URL or local IP for testing
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://kavach-campus.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0d14',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Geolocation: {
      // Permissions for emergency SOS & Safe Walk tracking
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },
};

export default config;
