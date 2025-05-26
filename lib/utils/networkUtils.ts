import NetInfo from "@react-native-community/netinfo";

/**
 * Check network connectivity before making requests
 * This function is more reliable with a timeout
 */
export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    // Add a timeout to the network check
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), 3000); // Default to true after 3 seconds to prevent blocking
    });
    
    const networkCheckPromise = new Promise<boolean>(async (resolve) => {
      try {
        const state = await NetInfo.fetch();
        // Only return false if we're definitely offline
        resolve(!(state.isConnected === false && state.isInternetReachable === false));
      } catch (e) {
        // If there's any error checking connectivity, assume we're online
        console.warn("Error checking network:", e);
        resolve(true);
      }
    });
    
    // Race the timeout against the actual check
    return await Promise.race([networkCheckPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Error in isNetworkAvailable:", error);
    // Default to true if there's any error in the check
    return true;
  }
}; 