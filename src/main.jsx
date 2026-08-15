import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import Storefront from './Storefront.jsx'
import AdminV3 from './AdminV3.jsx'
import './styles.css'
import './v2.css'
import './storefront.css'
import './admin.css'

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

  const adminFromQuery = new URLSearchParams(window.location.search).get('admin') === '1'
  const adminFromHash = window.location.hash.startsWith('#/admin')
  return adminFromQuery || adminFromHash ? <AdminV3 /> : <Storefront key={locationKey.startsWith('#/produit/') ? locationKey : 'store'} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
