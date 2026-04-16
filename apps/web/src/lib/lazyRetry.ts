// A function to retry loading a chunk to avoid chunk load error for out of date code
export const lazyRetry = function(componentImport: () => Promise<any>) {
  return new Promise((resolve, reject) => {
    // Check if the window has already been refreshed
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );
    
    // Try to import the component
    componentImport()
      .then((component) => {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'false'); // Success so reset the refresh
        resolve(component);
      })
      .catch((error) => {
        if (!hasRefreshed) { // Not been refreshed yet
          window.sessionStorage.setItem('retry-lazy-refreshed', 'true'); // We are now going to refresh
          return window.location.reload(); // Refresh the page
        }
        reject(error); // Default error behaviour as already tried refresh
      });
  });
};
