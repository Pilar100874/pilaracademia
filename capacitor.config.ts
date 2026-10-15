import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b0033e098bdc4a768c5fa6ce7f51959a',
  appName: 'pilaracademia',
  webDir: 'dist',
  server: {
    url: 'https://b0033e09-8bdc-4a76-8c5f-a6ce7f51959a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
