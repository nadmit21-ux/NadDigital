import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  Menu,
  Music2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { products, storeConfig } from './storeConfig.js'

const FILTERS = [
  ['all', 'Tout'],
  ['ebook', 'E-books'],
  ['music', 'Musiques'],
  ['service', 'Services'],
]

const iconMap = {
  book: BookOpen,
  sparkles: Sparkles,
  code: Code2,
  music: Music2,
}

const money = (value) =>
  new Intl.NumberFormat(storeConfig.locale, {
    style: 'currency',
    currency: storeConfig.currency,
  }).format(value)

const buildOrderId = () => {
  const date = new Date()
  const stamp = [
    String(date.getFullYear()).slice(-2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ND-${stamp}-${suffix}`
}

export default function App() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [order, setOrder] = useState(null)
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('naddigital-cart')) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('naddigital-cart', JSON.stringify(cart))
  }, [cart])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatches = filter === 'all' || product.type === filter
      const textMatches = !q || `${product.title} ${product.description}`.toLowerCase().includes(q)
      return categoryMatches && textMatches
    })
  }, [filter, query])

  const cartItems = cart
    .map((entry) => ({ ...products.find((item) => item.id === entry.id), quantity: entry.quantity }))
    .filter((item) => item.id)

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { id: product.id, quantity: 1 }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (id) => setCart((current) => current.filter((item) => item.id !== id))

  const createOrder = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const methodId = form.get('paymentMethod')
    const paymentMethod = storeConfig.paymentMethods.find((method) => method.id === methodId)
    const nextOrder = {
      id: buildOrderId(),
      createdAt: new Date().toISOString(),
      customer: {
        name: form.get('name'),
        contact: form.get('contact'),
      },
      paymentMethod,
      items: cartItems,
      total,
      status: 'En attente de paiement',
    }

    const existingOrders = JSON.parse(localStorage.getItem('naddigital-orders') || '[]')
    localStorage.setItem('naddigital-orders', JSON.stringify([nextOrder, ...existingOrders]))
    setOrder(nextOrder)
    setCart([])
    setCheckoutOpen(false)
    setCartOpen(false)
  }

  const copyOrder = async () => {
    if (!order) return
    const lines = [
      `Commande ${order.id}`,
      `Client : ${order.customer.name}`,
      ...order.items.map((item) => `- ${item.title} x${item.quantity}`),
      `Total : ${money(order.total)}`,
      `Paiement : ${order.paymentMethod?.label || 'Non défini'}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NadDigital accueil">
          <span className="brand-mark">N</span>
          <span>NadDigital</span>
        </a>

        <nav className={mobileNavOpen ? 'nav-links open' : 'nav-links'} aria-label="Navigation principale">
          <a href="#shop" onClick={() => setMobileNavOpen(false)}>Boutique</a>
          <a href="#why" onClick={() => setMobileNavOpen(false)}>Pourquoi nous</a>
          <a href="#contact" onClick={() => setMobileNavOpen(false)}>Contact</a>
        </nav>

        <div className="header-actions">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen((value) => !value)} aria-label="Menu">
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={19} />
            <span>Panier</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Créations numériques • RDC & international</span>
            <h1>Des idées numériques qui deviennent <span>utiles.</span></h1>
            <p>{storeConfig.tagline} Découvrez des e-books, des créations musicales et des services conçus avec soin.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#shop">Découvrir la boutique</a>
              <a className="secondary-button" href="#contact">Parler d’un projet</a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> Commande claire</span>
              <span><CheckCircle2 size={17} /> Paiement vérifié</span>
              <span><Sparkles size={17} /> Livraison numérique</span>
            </div>
          </div>
          <div className="hero-card" aria-hidden="true">
            <div className="glow-card card-a"><BookOpen /></div>
            <div className="glow-card card-b"><Music2 /></div>
            <div className="glow-card card-c"><Code2 /></div>
            <div className="hero-orbit">NadDigital</div>
          </div>
        </section>

        <section id="shop" className="shop-section section-wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Catalogue</span>
              <h2>Choisissez ce qui vous fait avancer.</h2>
            </div>
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit…" aria-label="Rechercher" />
            </div>
          </div>

          <div className="filter-row" role="group" aria-label="Filtrer le catalogue">
            {FILTERS.map(([value, label]) => (
              <button key={value} className={filter === value ? 'filter active' : 'filter'} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => {
              const Icon = iconMap[product.icon] || Sparkles
              return (
                <article className="product-card" key={product.id}>
                  <div className={`product-visual visual-${product.type}`}>
                    <span className="product-badge">{product.badge}</span>
                    <Icon size={52} strokeWidth={1.5} />
                  </div>
                  <div className="product-body">
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    <div className="product-footer">
                      <div className="price-wrap">
                        <strong>{money(product.price)}</strong>
                        {product.priceIsPlaceholder && <small>prix provisoire</small>}
                      </div>
                      <button className="add-button" onClick={() => addToCart(product)}>Ajouter</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {visibleProducts.length === 0 && <div className="empty-state">Aucun produit ne correspond à votre recherche.</div>}
        </section>

        <section id="why" className="why-section section-wrap">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Une expérience simple</span>
              <h2>De la découverte à la livraison.</h2>
            </div>
          </div>
          <div className="steps-grid">
            <div className="step-card"><span>01</span><h3>Choisissez</h3><p>Ajoutez vos e-books, musiques ou services au panier.</p></div>
            <div className="step-card"><span>02</span><h3>Commandez</h3><p>Renseignez votre nom, votre contact et le moyen de paiement choisi.</p></div>
            <div className="step-card"><span>03</span><h3>Payez</h3><p>Suivez les instructions Mobile Money affichées avec votre numéro de commande.</p></div>
            <div className="step-card"><span>04</span><h3>Recevez</h3><p>Après vérification, votre produit numérique ou votre service peut être livré.</p></div>
          </div>
        </section>

        <section id="contact" className="contact-section section-wrap">
          <div>
            <span className="eyebrow">Projet personnalisé</span>
            <h2>Vous avez besoin de quelque chose de spécifique ?</h2>
            <p>Utilisez la boutique pour les offres standards. Les coordonnées de contact seront activées ici dès qu’elles seront configurées.</p>
          </div>
          <a className="secondary-button disabled-link" href="#shop">Voir les services</a>
        </section>
      </main>

      <footer className="footer section-wrap">
        <div className="brand"><span className="brand-mark">N</span><span>NadDigital</span></div>
        <p>© {new Date().getFullYear()} NadDigital. Boutique numérique.</p>
      </footer>

      {cartOpen && (
        <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
          <aside className="drawer" aria-label="Panier">
            <div className="drawer-header"><div><span className="eyebrow">Votre sélection</span><h2>Panier</h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Fermer"><X /></button></div>
            <div className="cart-list">
              {cartItems.length === 0 ? (
                <div className="empty-cart"><ShoppingBag size={42} /><h3>Votre panier est vide.</h3><p>Ajoutez un produit pour commencer.</p></div>
              ) : cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div><strong>{item.title}</strong><span>{item.quantity} × {money(item.price)}</span></div>
                  <button className="icon-button danger" onClick={() => removeFromCart(item.id)} aria-label={`Supprimer ${item.title}`}><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="cart-summary">
                <div><span>Total</span><strong>{money(total)}</strong></div>
                <p>Les prix actuels du catalogue sont provisoires et seront remplacés avant la mise en vente officielle.</p>
                <button className="primary-button full" onClick={() => setCheckoutOpen(true)}>Passer la commande</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="overlay modal-layer">
          <div className="checkout-modal">
            <div className="drawer-header"><div><span className="eyebrow">Finaliser</span><h2>Votre commande</h2></div><button className="icon-button" onClick={() => setCheckoutOpen(false)} aria-label="Fermer"><X /></button></div>
            <form onSubmit={createOrder}>
              <label>Nom complet<input name="name" required placeholder="Votre nom" /></label>
              <label>E-mail ou WhatsApp<input name="contact" required placeholder="Votre contact" /></label>
              <fieldset>
                <legend>Moyen de paiement</legend>
                {storeConfig.paymentMethods.map((method, index) => (
                  <label className="payment-option" key={method.id}>
                    <input type="radio" name="paymentMethod" value={method.id} defaultChecked={index === 0} />
                    <span><strong>{method.label}</strong><small>{method.number}</small></span>
                  </label>
                ))}
              </fieldset>
              <div className="checkout-total"><span>Total</span><strong>{money(total)}</strong></div>
              <p className="form-note">Aucune donnée bancaire n’est enregistrée par NadDigital. Le paiement Mobile Money sera confirmé séparément.</p>
              <button className="primary-button full" type="submit">Créer la commande</button>
            </form>
          </div>
        </div>
      )}

      {order && (
        <div className="overlay modal-layer">
          <div className="order-modal">
            <button className="icon-button close-order" onClick={() => setOrder(null)} aria-label="Fermer"><X /></button>
            <CheckCircle2 className="success-icon" size={52} />
            <span className="eyebrow">Commande créée</span>
            <h2>{order.id}</h2>
            <p>Conservez ce numéro. Votre commande est actuellement <strong>{order.status.toLowerCase()}</strong>.</p>
            <div className="payment-instructions">
              <span>Moyen de paiement</span>
              <strong>{order.paymentMethod?.label}</strong>
              <small>Numéro : {order.paymentMethod?.number}</small>
              <small>Compte : {order.paymentMethod?.accountName}</small>
            </div>
            {order.paymentMethod?.number === 'À configurer' && (
              <p className="warning-note">Le numéro de paiement n’a pas encore été configuré. N’effectuez aucun paiement avant que la boutique affiche un numéro officiel.</p>
            )}
            <button className="secondary-button full" onClick={copyOrder}><Copy size={17} /> Copier le récapitulatif</button>
          </div>
        </div>
      )}
    </div>
  )
}
