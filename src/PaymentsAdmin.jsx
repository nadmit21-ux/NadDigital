import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, CircleAlert, Clock3, CreditCard, RefreshCw,
  Save, ShieldCheck, Smartphone, XCircle,
} from 'lucide-react'
import { supabase } from './supabase.js'

const METHOD_LABELS = {
  airtel_money: 'Airtel Money',
  mpesa: 'M-Pesa',
}

const STATUS_LABELS = {
  pending: 'En attente',
  submitted: 'À vérifier',
  paid: 'Payé',
  failed: 'Référence refusée',
  cancelled: 'Annulé',
}

const formatMoney = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toLocaleString('fr-FR')} ${currency}`
  }
}

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value))
  : '—'

export default function PaymentsAdmin() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [orders, setOrders] = useState([])
  const [settings, setSettings] = useState(null)
  const [notes, setNotes] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setAuthChecked(true)
      return
    }
    setAuthChecked(false)
    supabase.from('profiles').select('id,role,email,display_name').eq('id', session.user.id).single()
      .then(({ data }) => {
        setProfile(data || null)
        setAuthChecked(true)
      })
  }, [session])

  const isAdmin = profile?.role === 'admin'

  const loadData = async () => {
    if (!isAdmin) return
    const [orderResult, settingsResult] = await Promise.all([
      supabase.from('orders').select('*').in('payment_method', ['airtel_money', 'mpesa']).order('created_at', { ascending: false }),
      supabase.from('store_settings').select('*').eq('id', 1).single(),
    ])
    if (orderResult.error || settingsResult.error) {
      setMessage(orderResult.error?.message || settingsResult.error?.message || 'Impossible de charger les paiements.')
    }
    setOrders(orderResult.data || [])
    setSettings(settingsResult.data || null)
  }

  useEffect(() => { loadData() }, [isAdmin])

  const stats = useMemo(() => ({
    verify: orders.filter((order) => order.payment_status === 'submitted').length,
    paid: orders.filter((order) => order.payment_status === 'paid').length,
    waiting: orders.filter((order) => order.payment_status === 'pending').length,
  }), [orders])

  const saveSettings = async (event) => {
    event.preventDefault()
    if (!settings) return
    setBusy(true)
    setMessage('')

    const airtelNumber = String(settings.airtel_money_number || '').trim()
    const airtelName = String(settings.airtel_money_name || '').trim()
    const mpesaNumber = String(settings.mpesa_number || '').trim()
    const mpesaName = String(settings.mpesa_name || '').trim()

    if ((airtelNumber && !airtelName) || (!airtelNumber && airtelName)) {
      setMessage('Pour Airtel Money, renseignez à la fois le numéro et le nom du titulaire.')
      setBusy(false)
      return
    }
    if ((mpesaNumber && !mpesaName) || (!mpesaNumber && mpesaName)) {
      setMessage('Pour M-Pesa, renseignez à la fois le numéro et le nom du titulaire.')
      setBusy(false)
      return
    }

    const { error } = await supabase.from('store_settings').update({
      airtel_money_number: airtelNumber || null,
      airtel_money_name: airtelName || null,
      mpesa_number: mpesaNumber || null,
      mpesa_name: mpesaName || null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)

    setMessage(error ? error.message : 'Coordonnées Mobile Money enregistrées.')
    setBusy(false)
    if (!error) await loadData()
  }

  const reviewPayment = async (order, nextStatus) => {
    if (busy) return
    if (nextStatus === 'paid' && !order.payment_reference) {
      setMessage('Cette commande ne contient encore aucune référence de transaction à vérifier.')
      return
    }

    setBusy(true)
    setMessage('')
    const verified = ['paid', 'failed'].includes(nextStatus)
    const note = String(notes[order.id] || '').trim().slice(0, 500)
    const now = new Date().toISOString()

    const { error } = await supabase.from('orders').update({
      payment_status: nextStatus,
      payment_verified_at: verified ? now : null,
      payment_verified_by: verified ? session.user.id : null,
      payment_review_note: note || null,
      updated_at: now,
    }).eq('id', order.id)

    if (error) setMessage(error.message)
    else {
      if (nextStatus === 'paid') setMessage(`Paiement ${order.order_number} validé.`)
      if (nextStatus === 'failed') setMessage(`Référence ${order.order_number} refusée. Le client peut en soumettre une nouvelle.`)
      if (nextStatus === 'pending') setMessage(`Paiement ${order.order_number} remis en attente.`)
      await loadData()
    }
    setBusy(false)
  }

  if (!authChecked) return <div className="pay-admin-loader">Vérification du compte…</div>

  if (!session || !isAdmin) {
    return (
      <main className="pay-admin-lock">
        <ShieldCheck size={44} />
        <h1>Accès propriétaire requis</h1>
        <p>Connectez-vous d’abord dans l’administration NadDigital.</p>
        <a href="#/admin">Ouvrir l’administration</a>
      </main>
    )
  }

  return (
    <div className="pay-admin-app">
      <header className="pay-admin-header">
        <div>
          <span className="pay-kicker">NadDigital • Paiements</span>
          <h1>Airtel Money & M-Pesa</h1>
          <p>Validation manuelle aujourd’hui, architecture prête pour les API marchandes plus tard.</p>
        </div>
        <div className="pay-header-actions">
          <a href="#/admin"><ArrowLeft size={17} /> Tableau de bord</a>
          <button type="button" onClick={loadData}><RefreshCw size={17} /> Actualiser</button>
        </div>
      </header>

      <main className="pay-admin-main">
        <section className="pay-stats">
          <article><CircleAlert /><div><strong>{stats.verify}</strong><span>À vérifier</span></div></article>
          <article><Clock3 /><div><strong>{stats.waiting}</strong><span>En attente</span></div></article>
          <article><CheckCircle2 /><div><strong>{stats.paid}</strong><span>Payés</span></div></article>
        </section>

        {message && <div className="pay-message">{message}</div>}

        {settings && (
          <section className="pay-panel">
            <div className="pay-panel-title"><Smartphone /><div><span>Configuration</span><h2>Coordonnées de réception</h2></div></div>
            <p className="pay-help">Ces informations sont affichées au client après la création de sa commande. NadDigital ne demandera jamais le code PIN Mobile Money d’un client.</p>
            <form className="pay-settings-form" onSubmit={saveSettings}>
              <div className="pay-method-box airtel">
                <div className="pay-method-head"><strong>Airtel Money</strong><span className={settings.airtel_money_number && settings.airtel_money_name ? 'active' : ''}>{settings.airtel_money_number && settings.airtel_money_name ? 'Actif' : 'Non configuré'}</span></div>
                <label>Numéro de réception<input value={settings.airtel_money_number || ''} onChange={(e) => setSettings({ ...settings, airtel_money_number: e.target.value })} placeholder="+243…" /></label>
                <label>Nom du titulaire<input value={settings.airtel_money_name || ''} onChange={(e) => setSettings({ ...settings, airtel_money_name: e.target.value })} placeholder="Nom affiché au client" /></label>
              </div>
              <div className="pay-method-box mpesa">
                <div className="pay-method-head"><strong>M-Pesa</strong><span className={settings.mpesa_number && settings.mpesa_name ? 'active' : ''}>{settings.mpesa_number && settings.mpesa_name ? 'Actif' : 'Non configuré'}</span></div>
                <label>Numéro de réception<input value={settings.mpesa_number || ''} onChange={(e) => setSettings({ ...settings, mpesa_number: e.target.value })} placeholder="+243…" /></label>
                <label>Nom du titulaire<input value={settings.mpesa_name || ''} onChange={(e) => setSettings({ ...settings, mpesa_name: e.target.value })} placeholder="Nom affiché au client" /></label>
              </div>
              <button className="pay-primary" disabled={busy} type="submit"><Save size={17} /> {busy ? 'Enregistrement…' : 'Enregistrer les moyens de paiement'}</button>
            </form>
          </section>
        )}

        <section className="pay-panel">
          <div className="pay-panel-title"><CreditCard /><div><span>Contrôle manuel</span><h2>Transactions clients</h2></div></div>
          {orders.length === 0 ? (
            <div className="pay-empty">Aucune commande Airtel Money ou M-Pesa pour le moment.</div>
          ) : (
            <div className="pay-order-list">
              {orders.map((order) => (
                <article key={order.id} className={`pay-order-card status-${order.payment_status}`}>
                  <div className="pay-order-top">
                    <div><strong>{order.order_number}</strong><span>{order.customer_name}</span><small>{order.customer_phone || order.customer_contact}</small></div>
                    <span className={`pay-status ${order.payment_status}`}>{STATUS_LABELS[order.payment_status] || order.payment_status}</span>
                  </div>

                  <div className="pay-order-grid">
                    <div><span>Moyen</span><strong>{METHOD_LABELS[order.payment_method] || order.payment_method}</strong></div>
                    <div><span>Montant exact</span><strong>{formatMoney(order.total, order.currency)}</strong></div>
                    <div><span>Numéro utilisé</span><strong>{order.payment_destination || '—'}</strong></div>
                    <div><span>Titulaire</span><strong>{order.payment_recipient || '—'}</strong></div>
                    <div><span>Référence</span><strong className="pay-reference">{order.payment_reference || 'Pas encore reçue'}</strong></div>
                    <div><span>Référence envoyée</span><strong>{formatDate(order.payment_submitted_at)}</strong></div>
                  </div>

                  {order.payment_review_note && <div className="pay-review-note"><span>Dernière note</span><p>{order.payment_review_note}</p></div>}

                  <label className="pay-note-field">Note interne de vérification<textarea rows="2" value={notes[order.id] || ''} onChange={(e) => setNotes({ ...notes, [order.id]: e.target.value })} placeholder="Ex. transaction retrouvée dans l’historique Airtel Money…" /></label>

                  <div className="pay-review-actions">
                    {order.payment_status === 'submitted' && <button className="pay-approve" disabled={busy} onClick={() => reviewPayment(order, 'paid')}><CheckCircle2 size={17} /> Valider le paiement</button>}
                    {order.payment_status === 'submitted' && <button className="pay-reject" disabled={busy} onClick={() => reviewPayment(order, 'failed')}><XCircle size={17} /> Refuser la référence</button>}
                    {['failed', 'paid'].includes(order.payment_status) && <button className="pay-secondary" disabled={busy} onClick={() => reviewPayment(order, 'pending')}><RefreshCw size={16} /> Remettre en attente</button>}
                  </div>

                  <footer className="pay-order-footer">
                    <span>Commande : {formatDate(order.created_at)}</span>
                    {order.payment_verified_at && <span>Vérifié : {formatDate(order.payment_verified_at)}</span>}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
