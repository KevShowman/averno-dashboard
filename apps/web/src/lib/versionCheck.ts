// Version checking to detect app updates
export const checkAppVersion = async () => {
  try {
    // Get current app version from the server
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/version`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const { version } = await response.json();
      const currentVersion = localStorage.getItem('app-version');
      
      if (currentVersion && currentVersion !== version) {
        // Version has changed, force reload
        console.log(`App version changed from ${currentVersion} to ${version}, reloading...`);
        localStorage.setItem('app-version', version);
        window.location.reload();
        return;
      }
      
      // Store the version for next check
      localStorage.setItem('app-version', version);
    } else {
      console.warn('Version check failed with status:', response.status);
    }
  } catch (error) {
    console.warn('Version check failed:', error);
    // Don't throw error, just log it to avoid breaking the app
  }
};

// Check version on route changes
export const setupVersionChecking = () => {
  // Only run version checking in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_VERSION_CHECK === 'true') {
    // Check version on initial load
    checkAppVersion();
    
    // Check version every 5 minutes
    setInterval(checkAppVersion, 5 * 60 * 1000);
    
    // Check version on visibility change (user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkAppVersion();
      }
    });
  }
};
