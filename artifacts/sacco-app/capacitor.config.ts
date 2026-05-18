import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bashmmoney.app",
  appName: "Bash M. Money",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      releaseType: "APK",
    },
  },
};

export default config;
