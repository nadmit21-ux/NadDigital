import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Boxes, CheckCircle2, Clock3, CreditCard, Download, ExternalLink,
  Package, ReceiptText, RefreshCw, ShieldCheck,
} from 'lucide-react'
import { supabase } from './supabase.js'

const PERIODS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: 'all', label: 'Tout' },
]

const PAYMENT_LABELS = { airtel_money: 'Airtel Money', mpesa: 'M-Pesa', manual: 'Manuel' }
const PAYMENT_STATUS_LABELS = { pending: 'En attente', submitted: 'À vérifier', paid: 'Payé', failed: 'Échec', cancelled: 'Annulé' }
const FULFILLMENT_LABELS = { pending: 'À traiter', processing: 'En traitement', delivered: 'Livré', cancelled: 'Annulé' }

const formatMoney = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: currency === 'CDF' ? 0 : 2 }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toLocaleString('fr-FR')} ${currency}`
  }
}

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—'

const metricDate = (order) => order.payment_status === 'paid' && order.payment_verified_at
  ? order.payment_verified_at
  : order.created_at

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

export default function AnalyticsAdmin() {
  const [session, setSession] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [period, setPeriod] = useState('30')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    setMessage('')
    const [ordersResult, itemsResult] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*').order('created_at', { ascending: false }),
    ])
    const error = ordersResult.error || itemsResult.error
    if (error) setMessage(`Impossible de charger toutes les statistiques : ${error.message}`)
    setOrders(ordersResult.data || [])
    setItems(itemsResult.data || [])
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    const verify = async (nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession?.user) {
        setAuthorized(false)
        setAuthLoading(false)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', nextSession.user.id).maybeSingle()
      if (!active) return
      const admin = profile?.role === 'admin'
      setAuthorized(admin)
      setAuthLoading(false)
      if (admin) loadData()
    }
    supabase.auth.getSession().then(({ data }) => verify(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => verify(nextSession))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const filteredOrders = useMemo(() => {
    if (period === 'all') return orders
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - Number(period))
    return orders.filter((order) => new Date(metricDate(order)) >= cutoff)
  }, [orders, period])

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders])
  const filteredIds = useMemo(() => new Set(filteredOrders.map((order) => order.id)), [filteredOrders])
  const filteredItems = useMemo(() => items.filter((item) => filteredIds.has(item.order_id)), [items, filteredIds])
  const paidOrders = useMemo(() => filteredOrders.filter((order) => order.payment_status === 'paid'), [filteredOrders])
  const paidIds = useMemo(() => new Set(paidOrders.map((order) => order.id)), [paidOrders])
  const paidItems = useMemo(() => filteredItems.filter((item) => paidIds.has(item.order_id)), [filteredItems, paidIds])

  const revenue = useMemo(() => {
    const grouped = {}
    paidOrders.forEach((order) => {
      grouped[order.currency] = (grouped[order.currency] || 0) + Number(order.total || 0)
    })
    return grouped
  }, [paidOrders])

  const paidCountByCurrency = useMemo(() => {
    const grouped = {}
    paidOrders.forEach((order) => { grouped[order.currency] = (grouped[order.currency] || 0) + 1 })
    return grouped
  }, [paidOrders])

  const currencies = useMemo(() => {
    const set = new Set([...Object.keys(revenue), ...filteredOrders.map((order) => order.currency).filter(Boolean)])
    return [...set].sort()
  }, [revenue, filteredOrders])

  const stats = useMemo(() => {
    const units = paidItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    const toVerify = filteredOrders.filter((order) => order.payment_status === 'submitted').length
    const deliveries = paidOrders.filter((order) => !['delivered', 'cancelled'].includes(order.fulfillment_status)).length
    const validatable = filteredOrders.filter((order) => !['cancelled', 'failed'].includes(order.payment_status)).length
    const paymentRate = validatable ? Math.round((paidOrders.length / validatable) * 100) : 0
    return { units, toVerify, deliveries, paymentRate }
  }, [paidItems, filteredOrders, paidOrders])

  const topProducts = useMemo(() => {
    const grouped = new Map()
    paidItems.forEach((item) => {
      const order = orderById.get(item.order_id)
      if (!order) return
      const key = `${item.product_title}__${order.currency}`
      const current = grouped.get(key) || { title: item.product_title, currency: order.currency, units: 0, revenue: 0 }
      current.units += Number(item.quantity || 0)
      current.revenue += Number(item.quantity || 0) * Number(item.unit_price || 0)
      grouped.set(key, current)
    })
    return [...grouped.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8)
  }, [paidItems, orderById])

  const paymentMethods = useMemo(() => {
    const grouped = {}
    filteredOrders.forEach((order) => {
      const key = order.payment_method || 'manual'
      grouped[key] = (grouped[key] || 0) + 1
    })
    const max = Math.max(1, ...Object.values(grouped))
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([method, count]) => ({ method, count, percent: Math.round(count / max * 100) }))
  }, [filteredOrders])

  const fulfillment = useMemo(() => {
    const grouped = {}
    paidOrders.forEach((order) => { grouped[order.fulfillment_status || 'pending'] = (grouped[order.fulfillment_status || 'pending'] || 0) + 1 })
    return grouped
  }, [paidOrders])

  const seriesByCurrency = useMemo(() => {
    const result = {}
    currencies.forEach((currency) => {
      const grouped = new Map()
      paidOrders.filter((order) => order.currency === currency).forEach((order) => {
        const key = new Date(metricDate(order)).toISOString().slice(0, 10)
        grouped.set(key, (grouped.get(key) || 0) + Number(order.total || 0))
      })
      const rows = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
      const max = Math.max(1, ...rows.map(([, value]) => value))
      result[currency] = rows.map(([date, value]) => ({ date, value, height: Math.max(6, Math.round(value / max * 100)) }))
    })
    return result
  }, [currencies, paidOrders])

  const recentPaid = useMemo(() => [...paidOrders]
    .sort((a, b) => new Date(metricDate(b)) - new Date(metricDate(a)))
    .slice(0, 8), [paidOrders])

  const exportCsv = () => {
    const headers = ['Commande', 'Date', 'Client', 'E-mail', 'Téléphone', 'Paiement', 'Statut paiement', 'Livraison', 'Total', 'Devise']
    const rows = filteredOrders.map((order) => [
      order.order_number,
      metricDate(order),
      order.customer_name,
      order.customer_email,
      order.customer_phone || order.customer_contact,
      PAYMENT_LABELS[order.payment_method] || order.payment_method,
      PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status,
      FULFILLMENT_LABELS[order.fulfillment_status] || order.fulfillment_status,
      order.total,
      order.currency,
    ])
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `naddigital-ventes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (authLoading) return <div className="analytics-lock">Vérification du compte…</div>
  if (!session || !authorized) return <main className="analytics-lock"><ShieldCheck size={44} /><h1>Statistiques privées</h1><p>Connectez-vous avec le compte propriétaire NadDigital pour consulter les ventes.</p><a href="#/admin">Ouvrir l’administration</a></main>

  return <div className="analytics-app">
    <header className="analytics-header">
      <div><a href="#/admin"><ArrowLeft size={17} /> Administration</a><span className="analytics-kicker">Pilotage commercial</span><h1>Statistiques de ventes</h1><p>Revenus validés, commandes, produits, paiements et livraisons depuis Supabase.</p></div>
      <div className="analytics-header-actions"><button onClick={loadData} disabled={loading}><RefreshCw size={16} /> Actualiser</button><button onClick={exportCsv} disabled={!filteredOrders.length}><Download size={16} /> Export CSV</button><a href="#/"><ExternalLink size={16} /> Boutique</a></div>
    </header>

    <main className="analytics-main">
      <section className="analytics-toolbar">
        <div><span>Période analysée</span><div className="analytics-periods">{PERIODS.map((item) => <button key={item.value} className={period === item.value ? 'active' : ''} onClick={() => setPeriod(item.value)}>{item.label}</button>)}</div></div>
        <p>{filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} dans la période</p>
      </section>

      {message && <div className="analytics-message">{message}</div>}
      {loading ? <div className="analytics-loading">Calcul des statistiques…</div> : <>
        <section className="analytics-revenue-grid">
          {(currencies.length ? currencies : ['USD']).map((currency) => <article key={currency} className="analytics-revenue-card"><span>Chiffre d’affaires validé · {currency}</span><strong>{formatMoney(revenue[currency] || 0, currency)}</strong><small>{paidCountByCurrency[currency] || 0} paiement{(paidCountByCurrency[currency] || 0) > 1 ? 's' : ''} validé{(paidCountByCurrency[currency] || 0) > 1 ? 's' : ''}</small><div>Panier moyen : <b>{formatMoney((revenue[currency] || 0) / Math.max(1, paidCountByCurrency[currency] || 0), currency)}</b></div></article>)}
        </section>

        <section className="analytics-kpis">
          <article><CheckCircle2 /><div><span>Commandes payées</span><strong>{paidOrders.length}</strong><small>{stats.paymentRate}% des commandes validables</small></div></article>
          <article><Boxes /><div><span>Unités vendues</span><strong>{stats.units}</strong><small>Produits des commandes payées</small></div></article>
          <article><CreditCard /><div><span>À vérifier</span><strong>{stats.toVerify}</strong><small>Références de paiement reçues</small></div></article>
          <article><Package /><div><span>Livraisons ouvertes</span><strong>{stats.deliveries}</strong><small>Payées mais pas terminées</small></div></article>
        </section>

        <section className="analytics-grid-two">
          <article className="analytics-panel analytics-chart-panel"><div className="analytics-panel-head"><div><span>Évolution</span><h2>Revenus validés</h2></div><ReceiptText /></div>
            {currencies.filter((currency) => (seriesByCurrency[currency] || []).length).length === 0 ? <div className="analytics-empty">Aucun revenu validé sur cette période.</div> : currencies.map((currency) => (seriesByCurrency[currency] || []).length > 0 && <div className="analytics-chart-block" key={currency}><div className="analytics-chart-label"><strong>{currency}</strong><span>{formatMoney(revenue[currency] || 0, currency)}</span></div><div className="analytics-bars">{seriesByCurrency[currency].map((point) => <div className="analytics-bar-col" key={point.date} title={`${point.date} · ${formatMoney(point.value, currency)}`}><div className="analytics-bar" style={{ height: `${point.height}%` }}></div><small>{new Date(`${point.date}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</small></div>)}</div></div>)}
          </article>

          <article className="analytics-panel"><div className="analytics-panel-head"><div><span>Catalogue</span><h2>Produits les plus vendus</h2></div><Boxes /></div>
            {topProducts.length === 0 ? <div className="analytics-empty">Aucun produit payé sur cette période.</div> : <div className="analytics-ranking">{topProducts.map((product, index) => <div key={`${product.title}-${product.currency}`}><b>{String(index + 1).padStart(2, '0')}</b><span><strong>{product.title}</strong><small>{product.units} unité{product.units > 1 ? 's' : ''}</small></span><em>{formatMoney(product.revenue, product.currency)}</em></div>)}</div>}
          </article>
        </section>

        <section className="analytics-grid-two">
          <article className="analytics-panel"><div className="analytics-panel-head"><div><span>Paiement</span><h2>Moyens utilisés</h2></div><CreditCard /></div>{paymentMethods.length === 0 ? <div className="analytics-empty">Aucune commande.</div> : <div className="analytics-progress-list">{paymentMethods.map((row) => <div key={row.method}><div><span>{PAYMENT_LABELS[row.method] || row.method}</span><strong>{row.count}</strong></div><div className="analytics-progress"><i style={{ width: `${row.percent}%` }}></i></div></div>)}</div>}</article>
          <article className="analytics-panel"><div className="analytics-panel-head"><div><span>Livraison</span><h2>État des commandes payées</h2></div><Package /></div><div className="analytics-status-grid">{Object.entries(FULFILLMENT_LABELS).map(([key, label]) => <div key={key}><span>{label}</span><strong>{fulfillment[key] || 0}</strong></div>)}</div></article>
        </section>

        <section className="analytics-panel analytics-recent"><div className="analytics-panel-head"><div><span>Activité</span><h2>Dernières ventes validées</h2></div><Clock3 /></div>{recentPaid.length === 0 ? <div className="analytics-empty">Aucune vente validée dans la période.</div> : <div className="analytics-sales-list">{recentPaid.map((order) => <article key={order.id}><div><strong>{order.order_number}</strong><span>{order.customer_name}</span></div><div><span>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span><small>{formatDate(metricDate(order))}</small></div><b>{formatMoney(order.total, order.currency)}</b></article>)}</div>}</section>

        <div className="analytics-note"><ShieldCheck size={17} /><p>Les chiffres utilisent les commandes enregistrées dans Supabase. Une commande de test marquée « Payée » est donc incluse jusqu’à ce que son statut soit corrigé ou qu’elle soit retirée de vos données de production.</p></div>
      </>}
    </main>
  </div>
}
