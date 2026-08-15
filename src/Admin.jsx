import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Copy,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  LogOut,
  MessageSquareText,
  PackagePlus,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { supabase } from './supabase.js'

const emptyProduct = {
  id: null,
  title: '',
  slug: '',
  type: 'ebook',
  short_description: '',
  description: '',
  price: 0,
  currency: 'USD',
  status: 'draft',
  featured: false,
  cover_url: '',
  preview_url: '',
}

const TYPE_LABELS = {
  ebook: 'E-book',
  music: 'Musique',
  service: 'Service',
  pack: 'Pack',
}

const STATUS_LABELS = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

const PAYMENT_LABELS = {
  airtel_money: 'Airtel Money',
  mpesa: 'M-Pesa',
  manual: 'Paiement manuel',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'En attente',
  submitted: 'Preuve reçue',
  paid: 'Payé',
  failed: 'Échec',
  cancelled: 'Annulé',
}

const FULFILLMENT_LABELS = {
  pending: 'À traiter',
  processing: 'En traitement',
  delivered: 'Livré',
  cancelled: 'Annulé',
}

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

const formatDate = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const friendlyAuthError = (error) => {
  const text = error?.message || ''
  if (/invalid login credentials/i.test(text)) return 'Adresse ou mot de passe incorrect.'
  if (/email rate limit exceeded/i.test(text)) return 'Trop d’e-mails ont été demandés récemment. Attendez un moment avant de réessayer.'
  if (/email not confirmed/i.test(text)) return 'Cette adresse e-mail n’est pas encore confirmée.'
  return text || 'Impossible de terminer l’authentification.'
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [email, setEmail] = useState('nadmit21@gmail.com')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.hash.includes('type=recovery'))
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [settingsData, setSettingsData] = useState(null)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [coverFile, setCoverFile] = useState(null)
  const [digitalFile, setDigitalFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [previewProduct, setPreviewProduct] = useState(null)
  const [busy, setBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setProfileChecked(true)
      setProfileError('')
      return
    }

    let cancelled = false
    setProfileChecked(false)
    setProfileError('')

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setProfile(null)
          setProfileError(`Impossible de vérifier le rôle administrateur : ${error.message}`)
        } else {
          setProfile(data)
        }
        setProfileChecked(true)
      })

    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(productForm.cover_url || '')
      return
    }
    const objectUrl = URL.createObjectURL(coverFile)
    setCoverPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [coverFile, productForm.cover_url])

  const isAdmin = profile?.role === 'admin'

  const loadAdminData = async () => {
    if (!isAdmin) return
    const [productResult, orderResult, configResult, inquiryResult] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('store_settings').select('*').eq('id', 1).single(),
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
    ])

    const firstError = productResult.error || orderResult.error || configResult.error || inquiryResult.error
    if (firstError) setMessage(`Certaines données n’ont pas pu être chargées : ${firstError.message}`)

    setProducts(productResult.data || [])
    setOrders(orderResult.data || [])
    setSettingsData(configResult.data || null)
    setInquiries(inquiryResult.data || [])
  }

  useEffect(() => {
    loadAdminData()
  }, [isAdmin])

  const stats = useMemo(() => ({
    products: products.length,
    published: products.filter((p) => p.status === 'published').length,
    pending: orders.filter((o) => !['paid', 'cancelled'].includes(o.payment_status)).length,
    unread: inquiries.filter((item) => item.status === 'new').length,
  }), [products, orders, inquiries])

  const loginWithPassword = async (event) => {
    event.preventDefault()
    setAuthBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMessage(friendlyAuthError(error))
    setAuthBusy(false)
  }

  const sendPasswordReset = async () => {
    setAuthBusy(true)
    setMessage('')
    const redirectTo = `${window.location.origin}${window.location.pathname}?admin=1`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setMessage(error ? friendlyAuthError(error) : 'Un e-mail de réinitialisation a été envoyé. Ouvrez uniquement le dernier message reçu.')
    setAuthBusy(false)
  }

  const saveNewPassword = async (event) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      setMessage('Choisissez un mot de passe d’au moins 8 caractères.')
      return
    }
    setAuthBusy(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setMessage(friendlyAuthError(error))
    } else {
      setNewPassword('')
      setRecoveryMode(false)
      window.history.replaceState({}, '', `${window.location.pathname}?admin=1`)
      setMessage('Mot de passe enregistré. Les prochaines connexions se feront directement avec votre e-mail et ce mot de passe.')
    }
    setAuthBusy(false)
  }

  const uploadPublicCover = async (file, productId) => {
    if (!file) return productForm.cover_url || null
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `${productId}/${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('product-media').upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl
  }

  const uploadPrivateProduct = async (file, productId) => {
    if (!file) return
    const extension = file.name.split('.').pop() || 'bin'
    const path = `${productId}/${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('product-files').upload(path, file, { upsert: true })
    if (error) throw error
    const { error: dbError } = await supabase.from('product_files').upsert({ product_id: productId, storage_path: path })
    if (dbError) throw dbError
  }

  const resetProductForm = () => {
    setProductForm(emptyProduct)
    setCoverFile(null)
    setDigitalFile(null)
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const payload = {
        title: productForm.title.trim(),
        slug: productForm.slug.trim() || slugify(productForm.title),
        type: productForm.type,
        short_description: productForm.short_description,
        description: productForm.description,
        price: Number(productForm.price),
        currency: productForm.currency,
        status: productForm.status,
        featured: Boolean(productForm.featured),
        preview_url: productForm.preview_url || null,
        updated_at: new Date().toISOString(),
      }

      let product
      if (productForm.id) {
        const { data, error } = await supabase.from('products').update(payload).eq('id', productForm.id).select().single()
        if (error) throw error
        product = data
      } else {
        const { data, error } = await supabase.from('products').insert({ ...payload, created_by: session.user.id }).select().single()
        if (error) throw error
        product = data
      }

      const coverUrl = await uploadPublicCover(coverFile, product.id)
      if (coverUrl && coverUrl !== product.cover_url) {
        const { error } = await supabase.from('products').update({ cover_url: coverUrl }).eq('id', product.id)
        if (error) throw error
      }

      await uploadPrivateProduct(digitalFile, product.id)
      resetProductForm()
      setMessage(product.status === 'published' ? 'Produit enregistré et publié.' : 'Produit enregistré.')
      await loadAdminData()
    } catch (error) {
      setMessage(error.message || 'Impossible d’enregistrer le produit.')
    } finally {
      setBusy(false)
    }
  }

  const editProduct = (product) => {
    setProductForm({ ...emptyProduct, ...product })
    setCoverFile(null)
    setDigitalFile(null)
    setTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const previewCurrentProduct = () => {
    if (!productForm.title.trim()) {
      setMessage('Ajoutez au moins un titre avant d’ouvrir l’aperçu client.')
      return
    }
    setPreviewProduct({ ...productForm, cover_url: coverPreview })
  }

  const duplicateProduct = async (product) => {
    setBusy(true)
    setMessage('')
    const copyPayload = {
      title: `${product.title} — copie`,
      slug: `${product.slug}-copie-${Date.now().toString().slice(-6)}`,
      type: product.type,
      short_description: product.short_description,
      description: product.description,
      price: product.price,
      currency: product.currency,
      cover_url: product.cover_url,
      preview_url: product.preview_url,
      status: 'draft',
      featured: false,
      created_by: session.user.id,
    }
    const { error } = await supabase.from('products').insert(copyPayload)
    setMessage(error ? error.message : 'Copie créée en brouillon.')
    await loadAdminData()
    setBusy(false)
  }

  const archiveProduct = async (product) => {
    const { error } = await supabase.from('products').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', product.id)
    setMessage(error ? error.message : 'Produit archivé.')
    await loadAdminData()
  }

  const deleteProduct = async (id) => {
    if (!window.confirm('Supprimer définitivement ce produit ?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    setMessage(error ? error.message : 'Produit supprimé.')
    await loadAdminData()
  }

  const updateOrder = async (id, field, value) => {
    const { error } = await supabase.from('orders').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMessage(error.message)
    await loadAdminData()
  }

  const updateInquiry = async (id, status) => {
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id)
    setMessage(error ? error.message : 'Message mis à jour.')
    await loadAdminData()
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('store_settings').update({ ...settingsData, updated_at: new Date().toISOString() }).eq('id', 1)
    setMessage(error ? error.message : 'Coordonnées de la boutique enregistrées.')
    setBusy(false)
  }

  if (!session) {
    return (
      <main className="admin-auth-page">
        <a className="back-link" href="#/"><ArrowLeft size={17} /> Retour à la boutique</a>
        <section className="admin-auth-card">
          <div className="admin-lock"><ShieldCheck size={34} /></div>
          <span className="eyebrow">Espace propriétaire</span>
          <h1>Administration NadDigital</h1>
          <p>Connexion privée par e-mail et mot de passe. Les clients n’ont pas accès à cet espace.</p>
          <form onSubmit={loginWithPassword} className="admin-login-form">
            <label>Adresse e-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Mot de passe<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="primary-button full" disabled={authBusy} type="submit">{authBusy ? 'Connexion…' : 'Se connecter'}</button>
            <button className="secondary-button full" disabled={authBusy} type="button" onClick={sendPasswordReset}>Mot de passe oublié</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    )
  }

  if (recoveryMode) {
    return (
      <main className="admin-auth-page">
        <a className="back-link" href="#/"><ArrowLeft size={17} /> Retour à la boutique</a>
        <section className="admin-auth-card">
          <div className="admin-lock"><ShieldCheck size={34} /></div>
          <span className="eyebrow">Sécurité du propriétaire</span>
          <h1>Définir votre mot de passe</h1>
          <form onSubmit={saveNewPassword} className="admin-login-form">
            <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength="8" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
            <button className="primary-button full" disabled={authBusy} type="submit">{authBusy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    )
  }

  if (!profileChecked) return <div className="page-loader">Vérification du compte…</div>

  if (profileError) {
    return (
      <main className="admin-auth-page">
        <section className="admin-auth-card">
          <ShieldCheck className="admin-lock" size={40} />
          <h1>Vérification impossible</h1>
          <p>{profileError}</p>
          <button className="primary-button full" onClick={() => window.location.reload()}>Réessayer</button>
          <button className="secondary-button full" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </section>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="admin-auth-page">
        <a className="back-link" href="#/"><ArrowLeft size={17} /> Retour à la boutique</a>
        <section className="admin-auth-card">
          <ShieldCheck className="admin-lock" size={40} />
          <h1>Accès refusé</h1>
          <p>L’adresse <strong>{session.user.email}</strong> est authentifiée, mais elle ne possède pas le rôle propriétaire NadDigital.</p>
          <button className="secondary-button full" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </section>
      </main>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand admin-brand" href="#/"><span className="brand-mark">N</span><span>NadDigital</span></a>
        <span className="admin-badge"><ShieldCheck size={14} /> Propriétaire</span>
        <nav>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Boxes size={18} /><span>Produits</span></button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ReceiptText size={18} /><span>Commandes</span></button>
          <button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}><MessageSquareText size={18} /><span>Messages</span>{stats.unread > 0 && <b className="nav-count">{stats.unread}</b>}</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={18} /><span>Boutique</span></button>
        </nav>
        <a className="admin-store-link" href="#/"><ArrowLeft size={17} /> Voir la boutique</a>
        <button className="logout-button" onClick={() => supabase.auth.signOut()}><LogOut size={17} /> Déconnexion</button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <span className="eyebrow">Tableau de bord</span>
            <h1>Bonjour, propriétaire.</h1>
            <p className="admin-subtitle">Gérez votre catalogue, vos ventes et vos coordonnées depuis un seul endroit.</p>
          </div>
          <div className="admin-top-actions">
            <a className="secondary-button compact-action" href="#/"><ExternalLink size={16} /> Boutique</a>
            <button className="secondary-button compact-action mobile-logout" onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Quitter</button>
          </div>
        </div>

        <section className="dashboard-cards">
          <article><span>Produits</span><strong>{stats.products}</strong><small>{stats.published} publiés</small></article>
          <article><span>Paiements</span><strong>{stats.pending}</strong><small>à vérifier</small></article>
          <article><span>Messages</span><strong>{stats.unread}</strong><small>nouveaux</small></article>
        </section>

        {message && <div className="admin-flash"><CheckCircle2 size={18} /> <span>{message}</span><button onClick={() => setMessage('')}><X size={16} /></button></div>}

        {tab === 'products' && (
          <div className="admin-grid">
            <section className="admin-panel product-editor">
              <div className="panel-title"><PackagePlus /><div><span className="eyebrow">Catalogue</span><h2>{productForm.id ? 'Modifier le produit' : 'Ajouter un produit'}</h2></div></div>

              <div className="editor-cover-preview">
                <div className="editor-cover-image">
                  {coverPreview ? <img src={coverPreview} alt="Aperçu couverture" /> : <ImageIcon size={34} />}
                </div>
                <div><strong>{productForm.title || 'Nouveau produit'}</strong><span>{TYPE_LABELS[productForm.type]} · {STATUS_LABELS[productForm.status]}</span></div>
              </div>

              <form onSubmit={saveProduct} className="admin-form">
                <div className="form-row"><label>Titre<input required value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value, slug: productForm.id ? productForm.slug : slugify(e.target.value) })} /></label><label>Identifiant URL<input required value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} /></label></div>
                <div className="form-row"><label>Type<select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}><option value="ebook">E-book</option><option value="music">Musique</option><option value="service">Service</option><option value="pack">Pack</option></select></label><label>Statut<select value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label></div>
                <div className="form-row"><label>Prix<input type="number" min="0" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label>Devise<select value={productForm.currency} onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}><option>USD</option><option>CDF</option></select></label></div>
                <label>Résumé<input value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} placeholder="Une phrase qui donne envie d’ouvrir la fiche" /></label>
                <label>Description<textarea rows="5" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Décrivez clairement ce que le client reçoit…" /></label>
                <label>URL d’aperçu audio/vidéo<input value={productForm.preview_url || ''} onChange={(e) => setProductForm({ ...productForm, preview_url: e.target.value })} placeholder="https://…" /></label>

                <div className="upload-row">
                  <label className="file-field"><Upload size={17} /><span><strong>Couverture</strong><small>{coverFile?.name || (productForm.cover_url ? 'Couverture actuelle conservée' : 'JPG, PNG, WebP')}</small></span><input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></label>
                  <label className="file-field"><Upload size={17} /><span><strong>Fichier vendu</strong><small>{digitalFile?.name || 'PDF, audio, ZIP…'}</small></span><input type="file" onChange={(e) => setDigitalFile(e.target.files?.[0] || null)} /></label>
                </div>

                <label className="checkbox-field"><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} /> Mettre ce produit en avant sur la boutique</label>

                <div className="editor-actions">
                  <button className="primary-button" disabled={busy} type="submit"><Save size={17} /> {busy ? 'Enregistrement…' : 'Enregistrer'}</button>
                  <button type="button" className="secondary-button" onClick={previewCurrentProduct}><Eye size={17} /> Aperçu client</button>
                  {productForm.id && <button type="button" className="secondary-button" onClick={resetProductForm}>Annuler</button>}
                </div>
              </form>
            </section>

            <section className="admin-panel product-list-panel">
              <div className="panel-title"><Boxes /><div><span className="eyebrow">Inventaire</span><h2>{products.length} produits</h2></div></div>
              <div className="admin-product-list">
                {products.map((product) => (
                  <article key={product.id} className="admin-product-item">
                    <div className="mini-cover">{product.cover_url ? <img src={product.cover_url} alt="" /> : <ImageIcon size={20} />}</div>
                    <div className="grow"><strong>{product.title}</strong><span>{TYPE_LABELS[product.type] || product.type} · {product.price} {product.currency}</span><em className={`status-pill ${product.status}`}>{STATUS_LABELS[product.status] || product.status}</em></div>
                    <div className="product-actions">
                      <button title="Aperçu" onClick={() => setPreviewProduct(product)}><Eye size={16} /></button>
                      <button title="Modifier" onClick={() => editProduct(product)}>Modifier</button>
                      <button title="Dupliquer" onClick={() => duplicateProduct(product)}><Copy size={16} /></button>
                      {product.status !== 'archived' && <button title="Archiver" onClick={() => archiveProduct(product)}><Archive size={16} /></button>}
                      <button title="Supprimer" className="danger-text" onClick={() => deleteProduct(product.id)}><Trash2 size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'orders' && (
          <section className="admin-panel">
            <div className="panel-title"><ReceiptText /><div><span className="eyebrow">Ventes</span><h2>Commandes reçues</h2></div></div>
            <div className="orders-table">
              {orders.length === 0 ? <div className="empty-state"><ReceiptText size={30} /><strong>Aucune commande pour le moment.</strong><span>Les nouvelles commandes apparaîtront ici automatiquement.</span></div> : orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-main"><strong>{order.order_number}</strong><span>{order.customer_name}</span><small>{order.customer_contact}</small></div>
                  <div className="order-meta"><span>{formatDate(order.created_at)}</span><strong>{order.total} {order.currency}</strong><span>{PAYMENT_LABELS[order.payment_method] || order.payment_method || 'Paiement non défini'}</span>{order.payment_reference && <code>Réf. {order.payment_reference}</code>}</div>
                  <label>Paiement<select value={order.payment_status} onChange={(e) => updateOrder(order.id, 'payment_status', e.target.value)}>{Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>Livraison<select value={order.fulfillment_status} onChange={(e) => updateOrder(order.id, 'fulfillment_status', e.target.value)}>{Object.entries(FULFILLMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'messages' && (
          <section className="admin-panel">
            <div className="panel-title"><MessageSquareText /><div><span className="eyebrow">Contacts</span><h2>Messages clients</h2></div></div>
            <div className="inquiry-list">
              {inquiries.length === 0 ? <div className="empty-state"><MessageSquareText size={30} /><strong>Aucun message.</strong><span>Les demandes envoyées depuis la boutique apparaîtront ici.</span></div> : inquiries.map((item) => (
                <article key={item.id} className={`inquiry-card ${item.status === 'new' ? 'unread' : ''}`}>
                  <div className="inquiry-head"><div><strong>{item.name}</strong><span>{item.contact}</span></div><small>{formatDate(item.created_at)}</small></div>
                  {item.subject && <h3>{item.subject}</h3>}
                  <p>{item.message}</p>
                  <div className="inquiry-actions"><span className={`status-pill ${item.status}`}>{item.status === 'new' ? 'Nouveau' : item.status === 'read' ? 'Lu' : 'Fermé'}</span>{item.status === 'new' && <button onClick={() => updateInquiry(item.id, 'read')}>Marquer comme lu</button>}{item.status !== 'closed' && <button onClick={() => updateInquiry(item.id, 'closed')}>Fermer</button>}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'settings' && settingsData && (
          <section className="admin-panel settings-panel">
            <div className="panel-title"><Settings /><div><span className="eyebrow">Boutique</span><h2>Contacts et paiements</h2></div></div>

            <div className="payment-readiness">
              <div className={settingsData.airtel_money_number ? 'ready' : ''}><strong>Airtel Money</strong><span>{settingsData.airtel_money_number ? 'Numéro configuré' : 'À configurer'}</span></div>
              <div className={settingsData.mpesa_number ? 'ready' : ''}><strong>M-Pesa</strong><span>{settingsData.mpesa_number ? 'Numéro configuré' : 'À configurer'}</span></div>
              <div className={settingsData.whatsapp ? 'ready' : ''}><strong>WhatsApp</strong><span>{settingsData.whatsapp ? 'Contact configuré' : 'À configurer'}</span></div>
            </div>

            <form className="admin-form settings-form" onSubmit={saveSettings}>
              <div className="form-row"><label>Nom de la boutique<input value={settingsData.brand_name || ''} onChange={(e) => setSettingsData({ ...settingsData, brand_name: e.target.value })} /></label><label>Devise par défaut<select value={settingsData.currency || 'USD'} onChange={(e) => setSettingsData({ ...settingsData, currency: e.target.value })}><option>USD</option><option>CDF</option></select></label></div>
              <label>Slogan<input value={settingsData.tagline || ''} onChange={(e) => setSettingsData({ ...settingsData, tagline: e.target.value })} /></label>
              <div className="form-row"><label>WhatsApp<input value={settingsData.whatsapp || ''} onChange={(e) => setSettingsData({ ...settingsData, whatsapp: e.target.value })} placeholder="+243…" /></label><label>E-mail support<input type="email" value={settingsData.support_email || ''} onChange={(e) => setSettingsData({ ...settingsData, support_email: e.target.value })} /></label></div>

              <div className="payment-config-grid">
                <div><h3>Airtel Money</h3><label>Numéro<input value={settingsData.airtel_money_number || ''} onChange={(e) => setSettingsData({ ...settingsData, airtel_money_number: e.target.value })} placeholder="+243…" /></label><label>Nom du titulaire<input value={settingsData.airtel_money_name || ''} onChange={(e) => setSettingsData({ ...settingsData, airtel_money_name: e.target.value })} /></label></div>
                <div><h3>M-Pesa</h3><label>Numéro<input value={settingsData.mpesa_number || ''} onChange={(e) => setSettingsData({ ...settingsData, mpesa_number: e.target.value })} placeholder="+243…" /></label><label>Nom du titulaire<input value={settingsData.mpesa_name || ''} onChange={(e) => setSettingsData({ ...settingsData, mpesa_name: e.target.value })} /></label></div>
              </div>
              <p className="form-note">Ces coordonnées servent au paiement manuel. L’intégration API automatique Airtel Money/M-Pesa nécessitera ensuite des identifiants marchands officiels.</p>
              <button className="primary-button" disabled={busy} type="submit"><Save size={17} /> Enregistrer les paramètres</button>
            </form>
          </section>
        )}
      </main>

      {previewProduct && (
        <div className="preview-overlay" onClick={() => setPreviewProduct(null)}>
          <section className="client-preview-card" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewProduct(null)}><X size={20} /></button>
            <span className="eyebrow">Aperçu client</span>
            <div className="client-preview-cover">{previewProduct.cover_url ? <img src={previewProduct.cover_url} alt="" /> : <ImageIcon size={46} />}</div>
            <div className="client-preview-body">
              <div className="preview-badges"><span>{TYPE_LABELS[previewProduct.type] || previewProduct.type}</span>{previewProduct.featured && <span>À la une</span>}</div>
              <h2>{previewProduct.title}</h2>
              <p>{previewProduct.short_description || 'Ajoutez un résumé pour présenter ce produit.'}</p>
              <strong className="preview-price">{Number(previewProduct.price || 0).toLocaleString('fr-FR')} {previewProduct.currency}</strong>
              <button className="primary-button full" type="button">Ajouter au panier</button>
              <small>Ceci est un aperçu : aucun achat n’est effectué depuis cette fenêtre.</small>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
