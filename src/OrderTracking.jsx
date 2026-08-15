import { useMemo, useState } from 'react'
import {
  ArrowLeft, Check, CheckCircle2, CircleAlert, Clock3, CreditCard, Download,
  FileText, LockKeyhole, PackageCheck, ReceiptText, Search, ShieldCheck, Truck,
} from 'lucide-react'
import { supabase } from './supabase.js'

const PAYMENT_LABELS = {
  airtel_money: 'Airtel Money',
  mpesa: 'M-Pesa',
  manual: 'Confirmation avec NadDigital',
}

const PAYMENT_STATUS = {
  pending: 'En attente de paiement',
  submitted: 'Paiement à vérifier',
  paid: 'Paiement validé',
  failed: 'Référence refusée',
  cancelled: 'Paiement annulé',
}

const DELIVERY_STATUS = {
  pending: 'À traiter',
  processing: 'En traitement',
  delivered: 'Livrée',
  cancelled: 'Annulée',
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
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value))
  : '—'

const stageIndex = (order) => {
  if (!order) return -1
  if (order.current_stage === 'cancelled') return -2
  if (order.current_stage === 'delivered') return 5
  if (order.current_stage === 'processing') return 4
  if (order.current_stage === 'payment_paid') return 3
  if (order.current_stage === 'payment_review') return 2
  if (order.current_stage === 'payment_failed') return 1
  return 1
}

const STEPS = [
  { title: 'Commande reçue', description: 'Votre commande est enregistrée.', icon: ReceiptText },
  { title: 'En attente de paiement', description: 'Le paiement doit être effectué ou confirmé.', icon: CreditCard },
  { title: 'Paiement à vérifier', description: 'La référence est contrôlée par NadDigital.', icon: Search },
  { title: 'Paiement validé', description: 'La transaction a été confirmée.', icon: ShieldCheck },
  { title: 'En traitement', description: 'Votre produit ou service est en préparation.', icon: PackageCheck },
  { title: 'Livrée', description: 'La commande est terminée.', icon: Truck },
]

export default function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState('')
  const [identity, setIdentity] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const currentIndex = useMemo(() => stageIndex(order), [order])
  const hasDownload = useMemo(() => Boolean(order?.items?.some((item) => item.download_available)), [order])

  const lookup = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setOrder(null)
    setDownloadMessage('')
    setDownloadError('')

    const { data, error: invokeError } = await supabase.functions.invoke('track-order', {
      body: {
        orderNumber: orderNumber.trim().toUpperCase(),
        identity: identity.trim(),
      },
    })

    if (invokeError || !data?.ok) {
      setError(data?.error || invokeError?.message || 'Impossible de consulter cette commande.')
      setBusy(false)
      return
    }

    setOrder(data.order)
    setBusy(false)
  }

  const downloadProduct = async (item) => {
    if (!order || downloadBusy) return
    setDownloadBusy(item.product_id)
    setDownloadMessage('')
    setDownloadError('')

    const { data, error: invokeError } = await supabase.functions.invoke('secure-download', {
      body: {
        orderNumber: order.order_number,
        identity: identity.trim(),
        productId: item.product_id,
      },
    })

    if (invokeError || !data?.ok || !data?.url) {
      setDownloadError(data?.error || invokeError?.message || 'Impossible de préparer le téléchargement.')
      setDownloadBusy('')
      return
    }

    const minutes = Math.max(1, Math.ceil(Number(data.expires_in || 300) / 60))
    setDownloadMessage(`Lien sécurisé créé pour « ${item.product_title} ». Il expire dans ${minutes} minutes.`)
    window.location.assign(data.url)
    setDownloadBusy('')
  }

  return (
    <div className="track-app">
      <header className="track-header">
        <a className="track-brand" href="#/"><span>N</span><strong>NadDigital</strong></a>
        <a className="track-back" href="#/"><ArrowLeft size={17} /> Boutique</a>
      </header>

      <main className="track-main">
        <section className="track-hero">
          <div className="track-hero-copy">
            <span className="track-kicker"><ShieldCheck size={15} /> Suivi sécurisé</span>
            <h1>Suivez votre commande.</h1>
            <p>Entrez votre numéro de commande et l’e-mail ou le téléphone utilisé lors de l’achat.</p>
          </div>

          <form className="track-search-card" onSubmit={lookup}>
            <label>Numéro de commande
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ND-20260815-XXXXXX"
                autoCapitalize="characters"
                required
              />
            </label>
            <label>E-mail ou téléphone
              <input
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Votre e-mail ou +243…"
                required
              />
            </label>
            <button disabled={busy} type="submit"><Search size={18} /> {busy ? 'Recherche…' : 'Suivre la commande'}</button>
            <small>Ces deux informations doivent correspondre à la commande. Cela empêche un tiers de consulter vos achats avec le seul numéro ND.</small>
          </form>
        </section>

        {error && <div className="track-error"><CircleAlert size={19} /><span>{error}</span></div>}

        {order && (
          <>
            <section className="track-summary">
              <div className="track-summary-head">
                <div>
                  <span className="track-kicker">Commande</span>
                  <h2>{order.order_number}</h2>
                  <p>Créée le {formatDate(order.created_at)}</p>
                </div>
                <div className={`track-current-status stage-${order.current_stage}`}>
                  {order.current_stage === 'cancelled' ? <CircleAlert /> : order.current_stage === 'delivered' ? <CheckCircle2 /> : <Clock3 />}
                  <div><span>Statut actuel</span><strong>{order.current_stage === 'cancelled' ? 'Commande annulée' : order.current_stage === 'delivered' ? 'Livrée' : order.current_stage === 'processing' ? 'En traitement' : PAYMENT_STATUS[order.payment_status] || 'En cours'}</strong></div>
                </div>
              </div>

              <div className="track-facts">
                <div><span>Client</span><strong>{order.customer_name}</strong></div>
                <div><span>Contact vérifié</span><strong>{order.customer_email || order.customer_phone || '—'}</strong></div>
                <div><span>Total</span><strong>{formatMoney(order.total, order.currency)}</strong></div>
                <div><span>Paiement</span><strong>{PAYMENT_LABELS[order.payment_method] || order.payment_method || '—'}</strong></div>
                <div><span>État du paiement</span><strong>{PAYMENT_STATUS[order.payment_status] || order.payment_status}</strong></div>
                <div><span>Livraison</span><strong>{DELIVERY_STATUS[order.fulfillment_status] || order.fulfillment_status}</strong></div>
              </div>

              {order.payment_reference && (
                <div className="track-reference"><CreditCard size={18} /><div><span>Référence de transaction</span><strong>{order.payment_reference}</strong></div></div>
              )}

              {order.payment_status === 'paid' && order.current_stage !== 'cancelled' && (
                <div className={`track-delivery-banner ${hasDownload ? 'ready' : 'waiting'}`}>
                  {hasDownload ? <ShieldCheck size={21} /> : <Clock3 size={21} />}
                  <div>
                    <strong>{hasDownload ? 'Téléchargement sécurisé disponible' : 'Fichier numérique en préparation'}</strong>
                    <span>{hasDownload ? 'Les liens sont privés et expirent quelques minutes après leur génération.' : 'Le paiement est validé. Le bouton apparaîtra automatiquement dès que NadDigital aura attaché le fichier vendu.'}</span>
                  </div>
                </div>
              )}
            </section>

            {order.current_stage === 'cancelled' ? (
              <section className="track-cancelled"><CircleAlert size={24} /><div><h2>Cette commande est annulée.</h2><p>Contactez NadDigital si vous avez besoin d’informations supplémentaires.</p></div></section>
            ) : (
              <section className="track-progress-panel">
                <div className="track-section-title"><span>Progression</span><h2>De la commande à la livraison.</h2></div>
                <div className="track-steps">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon
                    const completed = index < currentIndex || currentIndex === 5
                    const active = index === currentIndex
                    const failed = order.current_stage === 'payment_failed' && index === 1
                    return (
                      <article key={step.title} className={`${completed ? 'completed' : ''} ${active ? 'active' : ''} ${failed ? 'failed' : ''}`}>
                        <div className="track-step-icon">{completed ? <Check size={19} /> : <Icon size={19} />}</div>
                        <div><strong>{failed ? 'Référence refusée' : step.title}</strong><p>{failed ? 'Une nouvelle référence de paiement peut être transmise.' : step.description}</p></div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="track-grid">
              <div className="track-panel">
                <div className="track-section-title"><span>Contenu</span><h2>Produits commandés</h2></div>

                {downloadError && <div className="track-download-feedback error"><CircleAlert size={17} /><span>{downloadError}</span></div>}
                {downloadMessage && <div className="track-download-feedback success"><ShieldCheck size={17} /><span>{downloadMessage}</span></div>}

                <div className="track-items">
                  {(order.items || []).map((item) => (
                    <div key={`${item.product_id}-${item.product_title}`}>
                      <FileText size={18} />
                      <div className="track-item-copy">
                        <strong>{item.product_title}</strong>
                        <span>{item.quantity} × {formatMoney(item.unit_price, order.currency)}</span>
                        {order.payment_status !== 'paid' ? (
                          <small className="track-file-state locked"><LockKeyhole size={13} /> Disponible après validation du paiement</small>
                        ) : item.download_available ? (
                          <button className="track-download-button" disabled={downloadBusy === item.product_id} onClick={() => downloadProduct(item)}>
                            <Download size={15} /> {downloadBusy === item.product_id ? 'Préparation…' : 'Télécharger'}
                          </button>
                        ) : (
                          <small className="track-file-state waiting"><Clock3 size={13} /> Fichier en préparation</small>
                        )}
                      </div>
                      <b>{formatMoney(Number(item.unit_price) * Number(item.quantity), order.currency)}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="track-panel">
                <div className="track-section-title"><span>Historique</span><h2>Activité de la commande</h2></div>
                <div className="track-timeline">
                  {(order.events || []).length === 0 ? <p>Aucun événement supplémentaire pour le moment.</p> : order.events.map((event, index) => (
                    <div key={`${event.event_type}-${event.created_at}-${index}`}>
                      <span className="track-timeline-dot"></span>
                      <div><strong>{event.title}</strong><p>{event.description}</p><small>{formatDate(event.created_at)}</small></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
