import { supabase, clearAllCache } from "../../lib/supabase";

const performSignOut = async () => {
  try {
    // Clear all caches before signing out
    await clearAllCache();
    await signOut();
  } catch (error) {
    console.error("Error signing out:", error);
    setSnackbarMessage(t("superAdmin.profile.signOutFailed"));
    setSnackbarVisible(true);
  } finally {
    setSignOutModalVisible(false);
  }
};
