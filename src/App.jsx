import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, CheckCircle2, Code2, Copy, Mail, Menu, MessageCircle,
  Music2, Search, ShieldCheck, ShoppingBag, Sparkles, Trash2, X,
} from 'lucide-react'
import { supabase } from './supabase.js'

const FILTERS = [['all','Tout'],['ebook','E-books'],['music','Musiques'],['service','Services'],['pack','Packs']]
const iconMap = { ebook: BookOpen, music: Music2, service: Code2, pack: Sparkles }

const formatMoney = (value, currency = 'USD') => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency,
}).format(Number(value || 0))

export default function App() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({ brand_name:'NadDigital', tagline:'Des créations numériques pensées pour vous faire avancer.', currency:'USD' })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [notice, setNotice] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('naddigital-cart') || '[]') } catch { return [] }
  })

  useEffect(() => {
    const load = async () => {
      const [{ data: productRows }, { data: config }] = await Promise.all([
        supabase.from('products').select('id,slug,type,title,short_description,description,price,currency,cover_url,preview_url,featured,status').eq('status','published').order('featured',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('store_settings').select('*').eq('id',1).single(),
      ])
      setProducts(productRows || [])
      if (config) setSettings(config)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => localStorage.setItem('naddigital-cart', JSON.stringify(cart)), [cart])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(p => (filter === 'all' || p.type === filter) && (!q || `${p.title} ${p.short_description} ${p.description}`.toLowerCase().includes(q)))
  }, [products, filter, query])

  const cartItems = cart.map(entry => ({ ...products.find(p => p.id === entry.id), quantity: entry.quantity })).filter(p => p.id)
  const cartCount = cart.reduce((sum, p) => sum + p.quantity, 0)
  const total = cartItems.reduce((sum, p) => sum + Number(p.price) * p.quantity, 0)
  const cartCurrency = cartItems[0]?.currency || settings.currency || 'USD'

  const addToCart = product => {
    setCart(current => {
      const found = current.find(i => i.id === product.id)
      return found ? current.map(i => i.id === product.id ? {...i, quantity:i.quantity+1} : i) : [...current,{id:product.id,quantity:1}]
    })
    setCartOpen(true)
  }

  const removeFromCart = id => setCart(c => c.filter(i => i.id !== id))

  const createOrder = async event => {
    event.preventDefault()
    setNotice('')
    const form = new FormData(event.currentTarget)
    const customerName = String(form.get('name') || '').trim()
    const customerContact = String(form.get('contact') || '').trim()
    const paymentMethod = String(form.get('paymentMethod') || 'manual')
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: { customerName, customerContact, paymentMethod, items: cart.map(i => ({ id:i.id, quantity:i.quantity })) },
    })
    if (error || data?.error) {
      setNotice(data?.error || error?.message || 'Impossible de créer la commande.')
      return
    }
    const payment = paymentMethod === 'airtel_money'
      ? { label:'Airtel Money', number:settings.airtel_money_number, name:settings.airtel_money_name }
      : paymentMethod === 'mpesa'
        ? { label:'M-Pesa', number:settings.mpesa_number, name:settings.mpesa_name }
        : { label:'Confirmation avec le vendeur', number:null, name:null }
    setOrder({ ...data.order, customerContact, payment })
    setCart([])
    setCheckoutOpen(false)
    setCartOpen(false)
  }

  const submitReference = async event => {
    event.preventDefault()
    setNotice('')
    const { data, error } = await supabase.functions.invoke('submit-payment-reference', {
      body: { orderNumber:order.order_number, contact:order.customerContact, reference:paymentReference },
    })
    if (error || data?.error) return setNotice(data?.error || error?.message || 'Référence non enregistrée.')
    setNotice('Référence de paiement enregistrée. La vérification peut maintenant commencer.')
    setOrder(current => ({...current, payment_status:'submitted'}))
  }

  const sendInquiry = async event => {
    event.preventDefault()
    setNotice('')
    const form = new FormData(event.currentTarget)
    const { error } = await supabase.from('inquiries').insert({
      name:String(form.get('name')||'').trim(),
      contact:String(form.get('contact')||'').trim(),
      subject:String(form.get('subject')||'').trim(),
      message:String(form.get('message')||'').trim(),
    })
    if (error) return setNotice('Impossible d’envoyer le message pour le moment.')
    event.currentTarget.reset()
    setNotice('Message envoyé à NadDigital.')
  }

  const whatsappHref = settings.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g,'')}` : null
  const paymentConfigured = Boolean(settings.airtel_money_number || settings.mpesa_number)

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top"><span className="brand-mark">N</span><span>{settings.brand_name || 'NadDigital'}</span></a>
        <nav className={mobileNavOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#shop" onClick={()=>setMobileNavOpen(false)}>Boutique</a>
          <a href="#services" onClick={()=>setMobileNavOpen(false)}>Fonctionnement</a>
          <a href="#contact" onClick={()=>setMobileNavOpen(false)}>Contact</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button mobile-menu" onClick={()=>setMobileNavOpen(v=>!v)}>{mobileNavOpen?<X size={20}/>:<Menu size={20}/>}</button>
          <button className="cart-button" onClick={()=>setCartOpen(true)}><ShoppingBag size={19}/><span>Panier</span><strong>{cartCount}</strong></button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap hero-v2">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15}/> Boutique créative • RDC & international</span>
            <h1>Des créations qui ont une <span>vraie valeur.</span></h1>
            <p>{settings.tagline}</p>
            <div className="hero-actions"><a className="primary-button" href="#shop">Explorer le catalogue</a><a className="secondary-button" href="#contact">Demander un service</a></div>
            <div className="trust-row"><span><ShieldCheck size={17}/> Commandes sécurisées</span><span><CheckCircle2 size={17}/> Suivi du paiement</span><span><Sparkles size={17}/> Livraison numérique</span></div>
          </div>
          <div className="showcase-stack">
            <div className="showcase-main"><span>NadDigital</span><strong>E-books • Musique • Services</strong><small>Une seule boutique pour découvrir, commander et entrer en contact.</small></div>
            <div className="showcase-chip chip-one"><BookOpen/> E-books</div>
            <div className="showcase-chip chip-two"><Music2/> Musique</div>
            <div className="showcase-chip chip-three"><Code2/> Services</div>
          </div>
        </section>

        <section id="shop" className="shop-section section-wrap">
          <div className="section-heading"><div><span className="eyebrow">Catalogue en direct</span><h2>Choisissez votre prochaine ressource.</h2></div><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…"/></div></div>
          <div className="filter-row">{FILTERS.map(([v,l])=><button key={v} className={filter===v?'filter active':'filter'} onClick={()=>setFilter(v)}>{l}</button>)}</div>
          {loading ? <div className="empty-state">Chargement du catalogue…</div> : <div className="product-grid">
            {visibleProducts.map(product => {
              const Icon = iconMap[product.type] || Sparkles
              return <article className="product-card product-card-v2" key={product.id}>
                <div className={`product-visual visual-${product.type}`}>{product.cover_url ? <img className="product-cover" src={product.cover_url} alt={product.title}/> : <Icon size={54} strokeWidth={1.4}/>}<span className="product-badge">{product.type}</span>{product.featured&&<span className="featured-badge">À la une</span>}</div>
                <div className="product-body"><h3>{product.title}</h3><p>{product.short_description || product.description}</p>{product.preview_url && <a className="preview-link" href={product.preview_url} target="_blank" rel="noreferrer">Voir / écouter l’aperçu</a>}<div className="product-footer"><strong>{formatMoney(product.price,product.currency)}</strong><button className="add-button" onClick={()=>addToCart(product)}>Ajouter</button></div></div>
              </article>
            })}
          </div>}
          {!loading && visibleProducts.length===0 && <div className="empty-state">Aucun produit ne correspond à votre recherche.</div>}
        </section>

        <section id="services" className="why-section section-wrap">
          <div className="section-heading compact"><div><span className="eyebrow">Simple et transparent</span><h2>De la découverte à la livraison.</h2></div></div>
          <div className="steps-grid"><div className="step-card"><span>01</span><h3>Découvrez</h3><p>Consultez les produits publiés directement depuis la base NadDigital.</p></div><div className="step-card"><span>02</span><h3>Commandez</h3><p>Le serveur recalcule les prix pour éviter toute manipulation côté navigateur.</p></div><div className="step-card"><span>03</span><h3>Payez</h3><p>Airtel Money, M-Pesa ou confirmation manuelle selon les moyens configurés.</p></div><div className="step-card"><span>04</span><h3>Suivez</h3><p>Envoyez la référence de transaction puis attendez la validation de la commande.</p></div></div>
        </section>

        <section id="contact" className="contact-hub section-wrap">
          <div className="contact-copy"><span className="eyebrow">Contact & références</span><h2>Besoin d’un produit personnalisé ou d’un renseignement ?</h2><p>Contactez NadDigital directement ou envoyez une demande depuis le formulaire.</p><div className="contact-links">{settings.support_email && <a href={`mailto:${settings.support_email}`}><Mail size={18}/><span><small>E-mail</small><strong>{settings.support_email}</strong></span></a>}{whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={18}/><span><small>WhatsApp</small><strong>{settings.whatsapp}</strong></span></a>}</div></div>
          <form className="contact-form" onSubmit={sendInquiry}><label>Votre nom<input name="name" required/></label><label>E-mail ou WhatsApp<input name="contact" required/></label><label>Objet<input name="subject" placeholder="Ex. création d’un site web"/></label><label>Message<textarea name="message" rows="5" required/></label><button className="primary-button" type="submit">Envoyer la demande</button></form>
        </section>
        {notice && <div className="global-notice section-wrap">{notice}</div>}
      </main>

      <footer className="footer section-wrap"><div className="brand"><span className="brand-mark">N</span><span>NadDigital</span></div><p>© {new Date().getFullYear()} NadDigital.</p><a className="owner-link" href="#/admin"><ShieldCheck size={15}/> Espace propriétaire</a></footer>

      {cartOpen && <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setCartOpen(false)}><aside className="drawer"><div className="drawer-header"><div><span className="eyebrow">Votre sélection</span><h2>Panier</h2></div><button className="icon-button" onClick={()=>setCartOpen(false)}><X/></button></div><div className="cart-list">{cartItems.length===0?<div className="empty-cart"><ShoppingBag size={40}/><h3>Panier vide</h3></div>:cartItems.map(item=><div className="cart-item" key={item.id}><div><strong>{item.title}</strong><span>{item.quantity} × {formatMoney(item.price,item.currency)}</span></div><button className="icon-button danger" onClick={()=>removeFromCart(item.id)}><Trash2 size={18}/></button></div>)}</div>{cartItems.length>0&&<div className="cart-summary"><div><span>Total</span><strong>{formatMoney(total,cartCurrency)}</strong></div><button className="primary-button full" onClick={()=>setCheckoutOpen(true)}>Passer commande</button></div>}</aside></div>}

      {checkoutOpen && <div className="overlay modal-layer"><div className="checkout-modal"><div className="drawer-header"><div><span className="eyebrow">Finaliser</span><h2>Commande</h2></div><button className="icon-button" onClick={()=>setCheckoutOpen(false)}><X/></button></div><form onSubmit={createOrder}><label>Nom complet<input name="name" required/></label><label>E-mail ou WhatsApp<input name="contact" required/></label><fieldset><legend>Moyen de paiement</legend><label className="payment-option"><input type="radio" name="paymentMethod" value="airtel_money" disabled={!settings.airtel_money_number}/><span><strong>Airtel Money</strong><small>{settings.airtel_money_number || 'À configurer par le vendeur'}</small></span></label><label className="payment-option"><input type="radio" name="paymentMethod" value="mpesa" disabled={!settings.mpesa_number}/><span><strong>M-Pesa</strong><small>{settings.mpesa_number || 'À configurer par le vendeur'}</small></span></label><label className="payment-option"><input type="radio" name="paymentMethod" value="manual" defaultChecked={!paymentConfigured}/><span><strong>Confirmation avec le vendeur</strong><small>Commande enregistrée avant paiement</small></span></label></fieldset><div className="checkout-total"><span>Total</span><strong>{formatMoney(total,cartCurrency)}</strong></div><p className="form-note">NadDigital ne demande jamais votre code PIN Mobile Money.</p><button className="primary-button full" type="submit">Créer la commande</button></form></div></div>}

      {order && <div className="overlay modal-layer"><div className="order-modal"><button className="icon-button close-order" onClick={()=>setOrder(null)}><X/></button><CheckCircle2 className="success-icon" size={50}/><span className="eyebrow">Commande enregistrée</span><h2>{order.order_number}</h2><p>Total : <strong>{formatMoney(order.total,order.currency)}</strong></p><div className="payment-instructions"><span>Paiement</span><strong>{order.payment.label}</strong>{order.payment.number&&<small>Numéro : {order.payment.number}</small>}{order.payment.name&&<small>Compte : {order.payment.name}</small>}</div>{order.payment.number && order.payment_status!=='submitted' && <form className="reference-form" onSubmit={submitReference}><label>Référence de transaction<input required value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Ex. ID de transaction"/></label><button className="primary-button full" type="submit">J’ai effectué le paiement</button></form>}<button className="secondary-button full" onClick={()=>navigator.clipboard.writeText(order.order_number)}><Copy size={17}/> Copier le numéro de commande</button>{notice&&<p className="admin-message">{notice}</p>}</div></div>}
    </div>
  )
}
