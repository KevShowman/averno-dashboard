import { useEffect } from 'react'

const BASE_TITLE = 'La Santa Calavera'

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    const previousTitle = document.title
    
    if (pageTitle) {
      document.title = `${pageTitle} | ${BASE_TITLE}`
    } else {
      document.title = `${BASE_TITLE} | Familia Management`
    }

    return () => {
      document.title = previousTitle
    }
  }, [pageTitle])
}

export default usePageTitle

