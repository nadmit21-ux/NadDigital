import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Code2,
  Copy, ExternalLink, Headphones, Mail, Menu, MessageCircle, Music2, Package,
  Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star, Trash2,
  Truck, X,
} from 'lucide-react'
import { supabase } from './supabase.js'

const CATEGORIES = [
  { value: 'ebook', label: 'E-books', subtitle: 'Guides et ressources numériques', icon: BookOpen },
  { value: 'music', label: 'Musiques', subtitle: 'Créations et contenus audio', icon: Music2 },
  { value: 'service', label: 'Services', subtitle: 'Prestations numériques sur mesure', icon: Code2 },
  { value: 'pack', label: 'Packs', subtitle: 'Plusieurs ressources réunies', icon: Package },
]

const TYPE_LABELS = { ebook: 'E-book', music: 'Musique', service: 'Service', pack: 'Pack' }
const TYPE_ICONS = { ebook: BookOpen, music: Music2, service: Code2, pack: Package }

const formatMoney = (value, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toLocaleString('fr-FR')} ${currency}`
  }
}

const parseDetails = (value) => String(value || '')
  .split(/\\n|\n|\r/)
  .map((item) => item.trim())
  .filter(Boolean)

const defaultDelivery = (type) => type === 'service'
  ? 'Après validation de votre commande, NadDigital vous contacte pour cadrer le besoin et confirmer la réalisation.'
  : 'Livraison numérique après validation du paiement. Le fichier ou les informations d’accès sont transmis par NadDigital.'

const productPath = (product) => `#/produit/${encodeURIComponent(product.slug)}`

function ProductCard({ product, onAdd, onOpen }) {
  const Icon = TYPE_ICONS[product.type] || Sparkles
  return (
    <article className="sf-product-card">
      <button className="sf-card-visual" onClick={() => onOpen(product)} aria-label={`Ouvrir ${product.title}`}>
        {product.cover_url ? <img src={product.cover_url} alt={product.title} /> : <div className={`sf-cover-placeholder ${product.type}`}><Icon size={58} strokeWidth={1.35} /></div>}
        <span className="sf-type-pill">{TYPE_LABELS[product.type] || product.type}</span>
        {product.featured && <span className="sf-featured-pill"><Star size={12} fill="currentColor" /> Populaire</span>}
      </button>
      <div className="sf-card-body">
        <button className="sf-card-title" onClick={() => onOpen(product)}>{product.title}</button>
        <p>{product.short_description || product.description || 'Découvrez ce produit NadDigital.'}</p>
        <div className="sf-card-footer">
          <strong>{formatMoney(product.price, product.currency)}</strong>
          <div className="sf-card-actions">
            <button className="sf-ghost-icon" onClick={() => onOpen(product)} title="Voir le produit"><ExternalLink size={17} /></button>
            <button className="sf-add-button" onClick={() => onAdd(product)}>Ajouter</button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({ brand_name: 'NadDigital', tagline: 'Des créations numériques pensées pour vous faire avancer.', currency: 'USD' })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [notice, setNotice] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [routeKey, setRouteKey] = useState(window.location.hash)
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('naddigital-cart') || '[]') } catch { return [] }
  })

  useEffect(() => {
    const onHash = () => {
      setRouteKey(window.location.hash)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [productResult, configResult] = await Promise.all([
        supabase
          .from('products')
          .select('id,slug,type,title,short_description,description,content_details,delivery_info,price,currency,cover_url,preview_url,featured,status,created_at,updated_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*').eq('id', 1).single(),
      ])
      if (productResult.error) setNotice('Le catalogue ne peut pas être chargé pour le moment.')
      setProducts(productResult.data || [])
      if (configResult.data) setSettings(configResult.data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => localStorage.setItem('naddigital-cart', JSON.stringify(cart)), [cart])

  const productSlug = routeKey.startsWith('#/produit/') ? decodeURIComponent(routeKey.replace('#/produit/', '')) : ''
  const selectedProduct = productSlug ? products.find((product) => product.slug === productSlug) : null

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = products.filter((product) => {
      const matchesCategory = category === 'all' || product.type === category
      const haystack = `${product.title} ${product.short_description} ${product.description} ${product.content_details}`.toLowerCase()
      return matchesCategory && (!q || haystack.includes(q))
    })
    return [...rows].sort((a, b) => {
      if (sort === 'price-low') return Number(a.price) - Number(b.price)
      if (sort === 'price-high') return Number(b.price) - Number(a.price)
      if (sort === 'featured') return Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [products, category, query, sort])

  const popularProducts = useMemo(() => {
    const featured = products.filter((product) => product.featured)
    return (featured.length ? featured : products).slice(0, 4)
  }, [products])

  const newestProducts = useMemo(() => [...products]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4), [products])

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((item) => [item.value, products.filter((p) => p.type === item.value).length])), [products])

  const cartItems = cart
    .map((entry) => ({ ...products.find((p) => p.id === entry.id), quantity: entry.quantity }))
    .filter((p) => p.id)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const cartCurrency = cartItems[0]?.currency || settings.currency || 'USD'

  const addToCart = (product, open = true) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      return found
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { id: product.id, quantity: 1 }]
    })
    if (open) setCartOpen(true)
  }

  const buyNow = (product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      return found ? current : [...current, { id: product.id, quantity: 1 }]
    })
    setCheckoutOpen(true)
  }

  const removeFromCart = (id) => setCart((current) => current.filter((item) => item.id !== id))

  const openProduct = (product) => { window.location.hash = productPath(product).slice(1) }

  const chooseCategory = (value) => {
    setCategory(value)
    setMobileNavOpen(false)
    window.location.hash = 'catalogue'
    setTimeout(() => document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }), 20)
  }

  const createOrder = async (event) => {
    event.preventDefault()
    setNotice('')
    const form = new FormData(event.currentTarget)
    const customerName = String(form.get('name') || '').trim()
    const customerContact = String(form.get('contact') || '').trim()
    const paymentMethod = String(form.get('paymentMethod') || 'manual')
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: { customerName, customerContact, paymentMethod, items: cart.map((item) => ({ id: item.id, quantity: item.quantity })) },
    })
    if (error || data?.error) {
      setNotice(data?.error || error?.message || 'Impossible de créer la commande.')
      return
    }
    const payment = paymentMethod === 'airtel_money'
      ? { label: 'Airtel Money', number: settings.airtel_money_number, name: settings.airtel_money_name }
      : paymentMethod === 'mpesa'
        ? { label: 'M-Pesa', number: settings.mpesa_number, name: settings.mpesa_name }
        : { label: 'Confirmation avec NadDigital', number: null, name: null }
    setOrder({ ...data.order, customerContact, payment })
    setCart([])
    setCheckoutOpen(false)
    setCartOpen(false)
  }

  const submitReference = async (event) => {
    event.preventDefault()
    setNotice('')
    const { data, error } = await supabase.functions.invoke('submit-payment-reference', {
      body: { orderNumber: order.order_number, contact: order.customerContact, reference: paymentReference },
    })
    if (error || data?.error) return setNotice(data?.error || error?.message || 'Référence non enregistrée.')
    setNotice('Référence de paiement enregistrée. NadDigital peut maintenant la vérifier.')
    setOrder((current) => ({ ...current, payment_status: 'submitted' }))
  }

  const sendInquiry = async (event) => {
    event.preventDefault()
    setNotice('')
    const form = new FormData(event.currentTarget)
    const { error } = await supabase.from('inquiries').insert({
      name: String(form.get('name') || '').trim(),
      contact: String(form.get('contact') || '').trim(),
      subject: String(form.get('subject') || '').trim(),
      message: String(form.get('message') || '').trim(),
    })
    if (error) return setNotice('Impossible d’envoyer le message pour le moment.')
    event.currentTarget.reset()
    setNotice('Votre message a bien été envoyé à NadDigital.')
  }

  const whatsappHref = settings.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}` : null
  const paymentConfigured = Boolean(settings.airtel_money_number || settings.mpesa_number)

  if (productSlug) {
    if (loading) return <div className="sf-full-loader">Chargement du produit…</div>
    if (!selectedProduct) {
      return <main className="sf-not-found"><Package size={48} /><h1>Produit introuvable</h1><p>Ce produit n’est plus disponible ou son adresse a changé.</p><a className="sf-primary" href="#/">Retour à la boutique</a></main>
    }

    const product = selectedProduct
    const Icon = TYPE_ICONS[product.type] || Package
    const details = parseDetails(product.content_details)
    const related = products.filter((p) => p.type === product.type && p.id !== product.id).slice(0, 3)

    return (
      <div className="sf-app product-page-app">
        <header className="sf-header product-header">
          <a className="sf-brand" href="#/"><span>N</span><strong>{settings.brand_name || 'NadDigital'}</strong></a>
          <a className="sf-back-store" href="#/"><ArrowLeft size={18} /> Retour à la boutique</a>
          <button className="sf-cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>{cartCount}</span></button>
        </header>

        <main className="sf-product-page">
          <nav className="sf-breadcrumb"><a href="#/">Accueil</a><span>/</span><button onClick={() => chooseCategory(product.type)}>{TYPE_LABELS[product.type]}</button><span>/</span><strong>{product.title}</strong></nav>

          <section className="sf-product-hero">
            <div className="sf-product-gallery">
              <div className={`sf-product-main-cover ${product.type}`}>
                {product.cover_url ? <img src={product.cover_url} alt={product.title} /> : <Icon size={92} strokeWidth={1.15} />}
              </div>
              <div className="sf-product-trust"><span><ShieldCheck size={17} /> Paiement vérifié</span><span><Truck size={17} /> Livraison numérique</span></div>
            </div>

            <div className="sf-product-info">
              <div className="sf-product-labels"><span>{TYPE_LABELS[product.type]}</span>{product.featured && <span className="popular"><Star size={12} fill="currentColor" /> Populaire</span>}</div>
              <h1>{product.title}</h1>
              <p className="sf-product-lead">{product.short_description || product.description}</p>
              <strong className="sf-product-price">{formatMoney(product.price, product.currency)}</strong>
              <div className="sf-product-cta-row">
                <button className="sf-primary sf-large" onClick={() => buyNow(product)}>Acheter maintenant <ArrowRight size={18} /></button>
                <button className="sf-secondary sf-large" onClick={() => addToCart(product)}><ShoppingBag size={18} /> Ajouter au panier</button>
              </div>
              <div className="sf-purchase-note"><CheckCircle2 size={18} /><span>Le montant final est recalculé par le serveur au moment de la commande.</span></div>
            </div>
          </section>

          {product.type === 'music' && product.preview_url && (
            <section className="sf-detail-section sf-audio-section">
              <div className="sf-section-title"><Headphones size={22} /><div><span>Extrait</span><h2>Écouter avant d’acheter</h2></div></div>
              <audio controls preload="metadata" src={product.preview_url}>Votre navigateur ne peut pas lire cet extrait audio.</audio>
              <a href={product.preview_url} target="_blank" rel="noreferrer">Ouvrir l’extrait séparément <ExternalLink size={15} /></a>
            </section>
          )}

          {product.type !== 'music' && product.preview_url && (
            <section className="sf-detail-section sf-preview-section">
              <div className="sf-section-title"><ExternalLink size={22} /><div><span>Aperçu</span><h2>Découvrir un aperçu du produit</h2></div></div>
              <a className="sf-secondary" href={product.preview_url} target="_blank" rel="noreferrer">Ouvrir l’aperçu <ExternalLink size={16} /></a>
            </section>
          )}

          <div className="sf-product-detail-grid">
            <section className="sf-detail-section">
              <div className="sf-section-title"><Sparkles size={22} /><div><span>Présentation</span><h2>À propos de ce produit</h2></div></div>
              <p className="sf-long-copy">{product.description || product.short_description || 'La description détaillée de ce produit sera ajoutée prochainement.'}</p>
            </section>

            <section className="sf-detail-section">
              <div className="sf-section-title"><Check size={22} /><div><span>Contenu</span><h2>Ce que vous trouverez</h2></div></div>
              <ul className="sf-content-list">
                {(details.length ? details : ['Produit numérique NadDigital', 'Informations détaillées dans la description', 'Livraison après validation de la commande']).map((item, index) => <li key={index}><CheckCircle2 size={17} /> {item}</li>)}
              </ul>
            </section>
          </div>

          <section className="sf-delivery-panel">
            <div className="sf-delivery-icon"><Truck size={28} /></div>
            <div><span>Livraison</span><h2>Comment recevrez-vous votre achat ?</h2><p>{product.delivery_info || defaultDelivery(product.type)}</p></div>
          </section>

          {related.length > 0 && (
            <section className="sf-related-section">
              <div className="sf-section-heading"><div><span>Dans la même catégorie</span><h2>Vous pourriez aussi aimer</h2></div></div>
              <div className="sf-product-grid">{related.map((item) => <ProductCard key={item.id} product={item} onAdd={addToCart} onOpen={openProduct} />)}</div>
            </section>
          )}
        </main>

        <footer className="sf-footer"><div className="sf-brand"><span>N</span><strong>NadDigital</strong></div><p>© {new Date().getFullYear()} NadDigital.</p></footer>
        {renderCommerceLayers()}
      </div>
    )
  }

  function renderCommerceLayers() {
    return (
      <>
        {cartOpen && <div className="sf-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}><aside className="sf-cart-drawer"><div className="sf-drawer-head"><div><span>Votre sélection</span><h2>Panier</h2></div><button onClick={() => setCartOpen(false)}><X /></button></div><div className="sf-cart-list">{cartItems.length === 0 ? <div className="sf-empty-cart"><ShoppingBag size={42} /><h3>Votre panier est vide</h3><p>Ajoutez un produit pour commencer.</p></div> : cartItems.map((item) => <article key={item.id} className="sf-cart-item"><div className="sf-cart-thumb">{item.cover_url ? <img src={item.cover_url} alt="" /> : <Package size={20} />}</div><div><strong>{item.title}</strong><span>{item.quantity} × {formatMoney(item.price, item.currency)}</span></div><button onClick={() => removeFromCart(item.id)}><Trash2 size={17} /></button></article>)}</div>{cartItems.length > 0 && <div className="sf-cart-bottom"><div><span>Total</span><strong>{formatMoney(total, cartCurrency)}</strong></div><button className="sf-primary sf-full" onClick={() => setCheckoutOpen(true)}>Passer commande <ArrowRight size={17} /></button></div>}</aside></div>}

        {checkoutOpen && <div className="sf-overlay sf-modal-layer"><section className="sf-checkout-modal"><div className="sf-drawer-head"><div><span>Finaliser</span><h2>Votre commande</h2></div><button onClick={() => setCheckoutOpen(false)}><X /></button></div><form onSubmit={createOrder}><label>Nom complet<input name="name" required /></label><label>E-mail ou WhatsApp<input name="contact" required /></label><fieldset><legend>Moyen de paiement</legend><label className="sf-payment-option"><input type="radio" name="paymentMethod" value="airtel_money" disabled={!settings.airtel_money_number} /><span><strong>Airtel Money</strong><small>{settings.airtel_money_number || 'Pas encore configuré'}</small></span></label><label className="sf-payment-option"><input type="radio" name="paymentMethod" value="mpesa" disabled={!settings.mpesa_number} /><span><strong>M-Pesa</strong><small>{settings.mpesa_number || 'Pas encore configuré'}</small></span></label><label className="sf-payment-option"><input type="radio" name="paymentMethod" value="manual" defaultChecked={!paymentConfigured} /><span><strong>Confirmation avec NadDigital</strong><small>Commande enregistrée avant paiement</small></span></label></fieldset><div className="sf-checkout-total"><span>Total</span><strong>{formatMoney(total, cartCurrency)}</strong></div><p className="sf-form-note">NadDigital ne vous demandera jamais votre code PIN Mobile Money.</p><button className="sf-primary sf-full" type="submit">Créer la commande</button></form></section></div>}

        {order && <div className="sf-overlay sf-modal-layer"><section className="sf-order-modal"><button className="sf-modal-close" onClick={() => setOrder(null)}><X /></button><CheckCircle2 size={52} className="sf-success-icon" /><span className="sf-kicker">Commande enregistrée</span><h2>{order.order_number}</h2><p>Montant à payer : <strong>{formatMoney(order.total, order.currency)}</strong></p><div className="sf-payment-instructions"><span>Moyen choisi</span><strong>{order.payment.label}</strong>{order.payment.number && <><p>Numéro : <b>{order.payment.number}</b></p>{order.payment.name && <p>Titulaire : <b>{order.payment.name}</b></p>}</>}</div>{order.payment.number && order.payment_status !== 'submitted' && <form className="sf-reference-form" onSubmit={submitReference}><label>Référence de transaction<input required value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Ex. ID de transaction" /></label><button className="sf-primary sf-full">Envoyer la référence</button></form>}{order.payment_status === 'submitted' && <div className="sf-reference-ok"><CheckCircle2 size={18} /> Référence envoyée, en attente de vérification.</div>}{notice && <div className="sf-notice">{notice}</div>}</section></div>}
      </>
    )
  }

  return (
    <div className="sf-app">
      <header className="sf-header">
        <a className="sf-brand" href="#top"><span>N</span><strong>{settings.brand_name || 'NadDigital'}</strong></a>
        <nav className={mobileNavOpen ? 'sf-nav open' : 'sf-nav'}>
          <a href="#top" onClick={() => setMobileNavOpen(false)}>Accueil</a>
          <button onClick={() => chooseCategory('ebook')}>E-books</button>
          <button onClick={() => chooseCategory('music')}>Musiques</button>
          <button onClick={() => chooseCategory('service')}>Services</button>
          <button onClick={() => chooseCategory('pack')}>Packs</button>
          <a href="#contact" onClick={() => setMobileNavOpen(false)}>Contact</a>
        </nav>
        <div className="sf-header-actions">
          <button className="sf-menu-button" onClick={() => setMobileNavOpen((value) => !value)}>{mobileNavOpen ? <X /> : <Menu />}</button>
          <button className="sf-cart-button" onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span>{cartCount}</span></button>
        </div>
      </header>

      <main id="top">
        <section className="sf-hero">
          <div className="sf-hero-copy">
            <span className="sf-kicker"><Sparkles size={15} /> Créations numériques • RDC & international</span>
            <h1>Des idées numériques conçues pour <em>vous faire avancer.</em></h1>
            <p>{settings.tagline || 'E-books, musiques, services et packs réunis dans une expérience simple et moderne.'}</p>
            <div className="sf-hero-actions"><a className="sf-primary sf-large" href="#catalogue">Explorer la boutique <ArrowRight size={18} /></a><a className="sf-secondary sf-large" href="#contact">Parler à NadDigital</a></div>
            <div className="sf-trust-strip"><span><ShieldCheck size={17} /> Paiement vérifié</span><span><CheckCircle2 size={17} /> Commandes suivies</span><span><Truck size={17} /> Livraison numérique</span></div>
          </div>
          <div className="sf-hero-art">
            <div className="sf-orbit sf-orbit-one"></div><div className="sf-orbit sf-orbit-two"></div>
            <div className="sf-hero-card main"><span>NadDigital</span><strong>Créer. Apprendre. Écouter. Commander.</strong><small>Une boutique numérique pensée pour être simple côté client et puissante côté propriétaire.</small></div>
            <div className="sf-floating-card ebooks"><BookOpen /><span>E-books</span></div>
            <div className="sf-floating-card music"><Music2 /><span>Musique</span></div>
            <div className="sf-floating-card services"><Code2 /><span>Services</span></div>
            <div className="sf-floating-card packs"><Package /><span>Packs</span></div>
          </div>
        </section>

        <section className="sf-category-section">
          <div className="sf-section-heading"><div><span>Explorer</span><h2>Tout NadDigital, par catégorie.</h2></div><p>Trouvez rapidement le type de ressource qui correspond à votre besoin.</p></div>
          <div className="sf-category-grid">{CATEGORIES.map(({ value, label, subtitle, icon: Icon }) => <button key={value} className="sf-category-card" onClick={() => chooseCategory(value)}><div className={`sf-category-icon ${value}`}><Icon /></div><div><strong>{label}</strong><span>{subtitle}</span></div><b>{counts[value] || 0}</b><ArrowRight size={18} /></button>)}</div>
        </section>

        {!loading && popularProducts.length > 0 && (
          <section className="sf-showcase-section">
            <div className="sf-section-heading"><div><span>À découvrir</span><h2>Produits populaires.</h2></div><button onClick={() => { setCategory('all'); setSort('featured'); window.location.hash = 'catalogue' }}>Voir tout <ArrowRight size={16} /></button></div>
            <div className="sf-horizontal-products">{popularProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onOpen={openProduct} />)}</div>
          </section>
        )}

        {!loading && newestProducts.length > 0 && (
          <section className="sf-showcase-section sf-new-section">
            <div className="sf-section-heading"><div><span>Nouveautés</span><h2>Les dernières publications.</h2></div></div>
            <div className="sf-horizontal-products">{newestProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onOpen={openProduct} />)}</div>
          </section>
        )}

        <section id="catalogue" className="sf-catalogue-section">
          <div className="sf-section-heading sf-catalogue-heading"><div><span>Catalogue</span><h2>Trouvez exactement ce qu’il vous faut.</h2></div><p>{visibleProducts.length} produit{visibleProducts.length > 1 ? 's' : ''} affiché{visibleProducts.length > 1 ? 's' : ''}</p></div>

          <div className="sf-catalogue-tools">
            <div className="sf-search-field"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un e-book, une musique, un service…" />{query && <button onClick={() => setQuery('')}><X size={16} /></button>}</div>
            <div className="sf-filter-tabs"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Tout</button>{CATEGORIES.map((item) => <button key={item.value} className={category === item.value ? 'active' : ''} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
            <label className="sf-sort-field"><SlidersHorizontal size={17} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Plus récents</option><option value="featured">Populaires</option><option value="price-low">Prix croissant</option><option value="price-high">Prix décroissant</option></select><ChevronDown size={15} /></label>
          </div>

          {loading ? <div className="sf-catalogue-loader">Chargement du catalogue…</div> : visibleProducts.length > 0 ? <div className="sf-product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onOpen={openProduct} />)}</div> : <div className="sf-no-results"><Search size={38} /><h3>Aucun résultat</h3><p>Essayez une autre recherche ou une autre catégorie.</p><button className="sf-secondary" onClick={() => { setQuery(''); setCategory('all') }}>Réinitialiser les filtres</button></div>}
        </section>

        <section className="sf-how-section">
          <div className="sf-section-heading"><div><span>Comment ça marche</span><h2>De la découverte à la livraison.</h2></div></div>
          <div className="sf-step-grid"><article><b>01</b><Search /><h3>Découvrez</h3><p>Recherchez et ouvrez la fiche complète du produit qui vous intéresse.</p></article><article><b>02</b><ShoppingBag /><h3>Commandez</h3><p>Ajoutez vos choix au panier et confirmez vos coordonnées.</p></article><article><b>03</b><ShieldCheck /><h3>Payez</h3><p>Utilisez les moyens configurés par NadDigital et transmettez votre référence.</p></article><article><b>04</b><Truck /><h3>Recevez</h3><p>Après validation, votre produit numérique ou votre service est livré selon les modalités indiquées.</p></article></div>
        </section>

        <section id="contact" className="sf-contact-section">
          <div className="sf-contact-copy"><span className="sf-kicker">Contact</span><h2>Une question ou un besoin personnalisé ?</h2><p>NadDigital reste disponible pour les renseignements, services sur mesure et demandes particulières.</p><div className="sf-contact-links">{settings.support_email && <a href={`mailto:${settings.support_email}`}><Mail /><span><small>E-mail</small><strong>{settings.support_email}</strong></span></a>}{whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle /><span><small>WhatsApp</small><strong>{settings.whatsapp}</strong></span></a>}</div></div>
          <form className="sf-contact-form" onSubmit={sendInquiry}><label>Votre nom<input name="name" required /></label><label>E-mail ou WhatsApp<input name="contact" required /></label><label>Objet<input name="subject" placeholder="Ex. besoin d’un site web" /></label><label>Votre message<textarea name="message" rows="5" required /></label><button className="sf-primary" type="submit">Envoyer le message <ArrowRight size={17} /></button></form>
        </section>

        {notice && <div className="sf-global-notice">{notice}<button onClick={() => setNotice('')}><X size={15} /></button></div>}
      </main>

      <footer className="sf-footer"><div className="sf-brand"><span>N</span><strong>NadDigital</strong></div><p>© {new Date().getFullYear()} NadDigital. Produits et services numériques.</p><a href="#/admin"><ShieldCheck size={15} /> Espace propriétaire</a></footer>
      {renderCommerceLayers()}
    </div>
  )
}
