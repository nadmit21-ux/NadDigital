import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import StorefrontV3 from './StorefrontV3.jsx'
import AdminV3 from './AdminV3.jsx'
import PaymentsAdmin from './PaymentsAdmin.jsx'
import './styles.css'
import './v2.css'
import './storefront.css'
import './mobile-storefront.css'
import './checkout-v3.css'
import './admin.css'
import './payments.css'

function Root() {
  const [locationKey, setLocationKey] = useState(`${window.location.search}${window.location.hash}`)

  useEffect(() => {
    const syncLocation = () => setLocationKey(`${window.location.search}${window.location.hash}`)
    window.addEventListener('hashchange', syncLocation)
    window.addEventListener('popstate', syncLocation)
    return () => {
      window.removeEventListener('hashchange', syncLocation)
      window.removeEventListener('popstate', syncLocation)
    }
  }, [])

  const paymentRoute = window.location.hash.startsWith('#/payments')
  const adminFromQuery = new URLSearchParams(window.location.search).get('admin') === '1'
  const adminFromHash = window.location.hash.startsWith('#/admin')

  if (paymentRoute) return <PaymentsAdmin />
  if (adminFromQuery || adminFromHash) {
    return <><AdminV3 /><a className="payment-hub-fab" href="#/payments">Paiements Mobile Money</a></>
  }
  return <StorefrontV3 key={locationKey.startsWith('#/produit/') ? locationKey : 'store'} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
