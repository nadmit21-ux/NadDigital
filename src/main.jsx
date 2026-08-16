import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import StorefrontV3 from './StorefrontV3.jsx'
import AdminV3 from './AdminV3.jsx'
import PaymentsAdmin from './PaymentsAdmin.jsx'
import OrderTracking from './OrderTracking.jsx'
import CommercialPages from './CommercialPages.jsx'
import CommercialFooter from './CommercialFooter.jsx'
import CommercialAdmin from './CommercialAdmin.jsx'
import AnalyticsAdmin from './AnalyticsAdmin.jsx'
import './styles.css'
import './v2.css'
import './storefront.css'
import './mobile-storefront.css'
import './checkout-v3.css'
import './admin.css'
import './payments.css'
import './tracking.css'
import './delivery.css'
import './commercial.css'
import './analytics.css'
import './admin-tools.css'

const COMMERCIAL_PAGES = {
  '#/a-propos': 'a-propos',
  '#/faq': 'faq',
  '#/conditions': 'conditions',
  '#/confidentialite': 'confidentialite',
  '#/remboursement-livraison': 'remboursement-livraison',
  '#/contact': 'contact',
}

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

  const hash = window.location.hash
  const paymentRoute = hash.startsWith('#/payments')
  const trackingRoute = hash.startsWith('#/suivi')
  const commercialAdminRoute = hash.startsWith('#/commercial')
  const analyticsRoute = hash.startsWith('#/analytics')
  const commercialPage = COMMERCIAL_PAGES[hash]
  const adminFromQuery = new URLSearchParams(window.location.search).get('admin') === '1'
  const adminFromHash = hash.startsWith('#/admin')
  const productRoute = hash.startsWith('#/produit/')

  if (paymentRoute) return <PaymentsAdmin />
  if (trackingRoute) return <OrderTracking />
  if (commercialAdminRoute) return <CommercialAdmin />
  if (analyticsRoute) return <AnalyticsAdmin />
  if (commercialPage) return <CommercialPages page={commercialPage} />
  if (adminFromQuery || adminFromHash) {
    return <><AdminV3 /><div className="admin-tools-stack"><a className="analytics-hub-fab" href="#/analytics">Statistiques</a><a className="payment-hub-fab" href="#/payments">Paiements Mobile Money</a><a className="commercial-hub-fab" href="#/commercial">Confiance & contacts</a></div></>
  }
  return <>
    <StorefrontV3 key={productRoute ? locationKey : 'store'} />
    <CommercialFooter compact={productRoute} />
    <a className="tracking-fab" href="#/suivi">Suivre ma commande</a>
  </>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
