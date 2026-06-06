// AEGIS-Ω hub router
// /          → AegisRuntime (living consciousness automaton)
// /pricing   → PricingPage (API key purchase)
import { AegisRuntime } from './components/AegisRuntime.js'
import { PricingPage }  from './components/PricingPage.js'

const path = window.location.pathname

export default function App() {
  if (path === '/pricing') return <PricingPage />
  return <AegisRuntime />
}
