import { supabase, clearAllCache } from "../../lib/supabase";

const handleSignOut = async () => {
  Alert.alert("Sign Out", "Are you sure you want to sign out?", [
    {
      text: "Cancel",
      style: "cancel",
    },
    {
      text: "Sign Out",
      onPress: async () => {
        try {
          // Clear all caches before signing out
          await clearAllCache();
          await signOut();
        } catch (error) {
          console.error("Error signing out:", error);
          setSnackbarMessage("Failed to sign out");
          setSnackbarVisible(true);
        }
      },
    },
  ]);
};
