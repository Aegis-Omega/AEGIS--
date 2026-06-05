import { SuccessPage } from './components/SuccessPage.js'
import { HomepageLanding } from './components/HomepageLanding.js'

export default function App() {
  const path = window.location.pathname
  
  if (path === '/success') return <SuccessPage />
  
  // Default to enterprise homepage (removes /tools route)
  return <HomepageLanding />
}
