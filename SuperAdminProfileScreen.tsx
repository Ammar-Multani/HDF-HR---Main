import { supabase, clearAllCache } from "../../lib/supabase";

const handleSignOut = async () => {
  Alert.alert(
    t("superAdmin.profile.signOut"),
    t("superAdmin.profile.confirmSignOut"),
    [
      {
        text: t("superAdmin.profile.cancel"),
        style: "cancel",
      },
      {
        text: t("superAdmin.profile.signOut"),
        onPress: async () => {
          try {
            // Clear all caches before signing out
            await clearAllCache();
            await signOut();
          } catch (error) {
            console.error("Error signing out:", error);
            setSnackbarMessage(t("superAdmin.profile.signOutFailed"));
            setSnackbarVisible(true);
          }
        },
      },
    ]
  );
};
