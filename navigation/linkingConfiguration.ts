import * as Linking from "expo-linking";

// Configure linking for deep linking and web URLs
export const linking = {
  prefixes: [
    "hdf-hr://", // Your app's URL scheme
    "https://*.yourdomain.com", // Your website domain (update this)
  ],
  config: {
    screens: {
      // Auth screens
      ResetPassword: {
        path: "reset-password",
        parse: {
          token: (token: string) => token,
        },
      },
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      // Add other screens as needed
    },
  },
}; 