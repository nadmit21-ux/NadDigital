import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Boxes, CheckCircle2, LogOut, PackagePlus, ReceiptText, Save, Settings, ShieldCheck, Trash2, Upload } from 'lucide-react'
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

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export default function Admin() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [settingsData, setSettingsData] = useState(null)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [coverFile, setCoverFile] = useState(null)
  const [digitalFile, setDigitalFile] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => setProfile(data))
  }, [session])

  const isAdmin = profile?.role === 'admin'

  const loadAdminData = async () => {
    if (!isAdmin) return
    const [{ data: productRows }, { data: orderRows }, { data: config }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('store_settings').select('*').eq('id', 1).single(),
    ])
    setProducts(productRows || [])
    setOrders(orderRows || [])
    setSettingsData(config)
  }

  useEffect(() => {
    loadAdminData()
  }, [isAdmin])

  const stats = useMemo(() => ({
    products: products.length,
    published: products.filter((p) => p.status === 'published').length,
    pending: orders.filter((o) => o.payment_status !== 'paid').length,
  }), [products, orders])

  const sendMagicLink = async (event) => {
    event.preventDefault()
    setMessage('')
    const redirectTo = `${window.location.origin}${window.location.pathname}#/admin`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    setMessage(error ? error.message : 'Lien de connexion envoyé. Vérifiez votre e-mail.')
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
      setProductForm(emptyProduct)
      setCoverFile(null)
      setDigitalFile(null)
      setMessage('Produit enregistré.')
      await loadAdminData()
    } catch (error) {
      setMessage(error.message || 'Impossible d’enregistrer le produit.')
    } finally {
      setBusy(false)
    }
  }

  const editProduct = (product) => {
    setProductForm({ ...emptyProduct, ...product })
    setTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return
    await supabase.from('products').delete().eq('id', id)
    await loadAdminData()
  }

  const updateOrder = async (id, field, value) => {
    await supabase.from('orders').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
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
          <p>Connexion sécurisée par lien e-mail. Les clients n’ont pas accès à cet espace.</p>
          <form onSubmit={sendMagicLink} className="admin-login-form">
            <label>Adresse e-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" /></label>
            <button className="primary-button full" type="submit">Recevoir le lien de connexion</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    )
  }

  if (!profile) return <div className="page-loader">Vérification du compte…</div>

  if (!isAdmin) {
    return (
      <main className="admin-auth-page">
        <a className="back-link" href="#/"><ArrowLeft size={17} /> Retour à la boutique</a>
        <section className="admin-auth-card">
          <ShieldCheck className="admin-lock" size={40} />
          <h1>Compte connecté</h1>
          <p>L’adresse <strong>{session.user.email}</strong> est authentifiée, mais le rôle administrateur n’est pas encore activé pour ce compte.</p>
          <button className="secondary-button full" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
        </section>
      </main>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="#/"><span className="brand-mark">N</span><span>NadDigital</span></a>
        <span className="admin-badge"><ShieldCheck size={14} /> Propriétaire</span>
        <nav>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Boxes size={18} /> Produits</button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ReceiptText size={18} /> Commandes</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings size={18} /> Boutique</button>
        </nav>
        <a className="admin-store-link" href="#/"><ArrowLeft size={17} /> Voir la boutique</a>
        <button className="logout-button" onClick={() => supabase.auth.signOut()}><LogOut size={17} /> Déconnexion</button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div><span className="eyebrow">Tableau de bord</span><h1>Bienvenue dans votre espace.</h1></div>
          <div className="admin-stats"><span><strong>{stats.products}</strong> produits</span><span><strong>{stats.published}</strong> publiés</span><span><strong>{stats.pending}</strong> paiements à vérifier</span></div>
        </div>
        {message && <div className="admin-flash"><CheckCircle2 size={18} /> {message}</div>}

        {tab === 'products' && (
          <div className="admin-grid">
            <section className="admin-panel product-editor">
              <div className="panel-title"><PackagePlus /><div><span className="eyebrow">Catalogue</span><h2>{productForm.id ? 'Modifier le produit' : 'Ajouter un produit'}</h2></div></div>
              <form onSubmit={saveProduct} className="admin-form">
                <div className="form-row"><label>Titre<input required value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value, slug: productForm.id ? productForm.slug : slugify(e.target.value) })} /></label><label>Slug<input required value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} /></label></div>
                <div className="form-row"><label>Type<select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}><option value="ebook">E-book</option><option value="music">Musique</option><option value="service">Service</option><option value="pack">Pack</option></select></label><label>Statut<select value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label></div>
                <div className="form-row"><label>Prix<input type="number" min="0" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label>Devise<select value={productForm.currency} onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}><option>USD</option><option>CDF</option></select></label></div>
                <label>Résumé<input value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} /></label>
                <label>Description<textarea rows="5" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
                <label>URL d’aperçu audio/vidéo<input value={productForm.preview_url || ''} onChange={(e) => setProductForm({ ...productForm, preview_url: e.target.value })} placeholder="https://…" /></label>
                <div className="upload-row"><label className="file-field"><Upload size={17} /> Couverture<input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></label><label className="file-field"><Upload size={17} /> Fichier vendu<input type="file" onChange={(e) => setDigitalFile(e.target.files?.[0] || null)} /></label></div>
                <label className="checkbox-field"><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} /> Mettre en avant</label>
                <div className="editor-actions"><button className="primary-button" disabled={busy} type="submit"><Save size={17} /> {busy ? 'Enregistrement…' : 'Enregistrer'}</button>{productForm.id && <button type="button" className="secondary-button" onClick={() => setProductForm(emptyProduct)}>Annuler</button>}</div>
              </form>
            </section>
            <section className="admin-panel product-list-panel">
              <div className="panel-title"><Boxes /><div><span className="eyebrow">Inventaire</span><h2>{products.length} produits</h2></div></div>
              <div className="admin-product-list">{products.map((product) => <article key={product.id} className="admin-product-item"><div className="mini-cover">{product.cover_url ? <img src={product.cover_url} alt="" /> : product.title.slice(0,1)}</div><div className="grow"><strong>{product.title}</strong><span>{product.type} • {product.price} {product.currency} • {product.status}</span></div><button onClick={() => editProduct(product)}>Modifier</button><button className="danger-text" onClick={() => deleteProduct(product.id)}><Trash2 size={16} /></button></article>)}</div>
            </section>
          </div>
        )}

        {tab === 'orders' && (
          <section className="admin-panel">
            <div className="panel-title"><ReceiptText /><div><span className="eyebrow">Ventes</span><h2>Commandes reçues</h2></div></div>
            <div className="orders-table">{orders.length === 0 ? <p>Aucune commande pour le moment.</p> : orders.map((order) => <article className="order-row" key={order.id}><div><strong>{order.order_number}</strong><span>{order.customer_name} • {order.customer_contact}</span></div><strong>{order.total} {order.currency}</strong><select value={order.payment_status} onChange={(e) => updateOrder(order.id, 'payment_status', e.target.value)}><option value="pending">Paiement en attente</option><option value="submitted">Preuve reçue</option><option value="paid">Payé</option><option value="failed">Échec</option><option value="cancelled">Annulé</option></select><select value={order.fulfillment_status} onChange={(e) => updateOrder(order.id, 'fulfillment_status', e.target.value)}><option value="pending">À traiter</option><option value="processing">En traitement</option><option value="delivered">Livré</option><option value="cancelled">Annulé</option></select></article>)}</div>
          </section>
        )}

        {tab === 'settings' && settingsData && (
          <section className="admin-panel settings-panel">
            <div className="panel-title"><Settings /><div><span className="eyebrow">Coordonnées</span><h2>Informations publiques et paiements</h2></div></div>
            <form className="admin-form" onSubmit={saveSettings}>
              <div className="form-row"><label>Nom de la boutique<input value={settingsData.brand_name || ''} onChange={(e) => setSettingsData({ ...settingsData, brand_name: e.target.value })} /></label><label>Devise<select value={settingsData.currency || 'USD'} onChange={(e) => setSettingsData({ ...settingsData, currency: e.target.value })}><option>USD</option><option>CDF</option></select></label></div>
              <label>Slogan<input value={settingsData.tagline || ''} onChange={(e) => setSettingsData({ ...settingsData, tagline: e.target.value })} /></label>
              <div className="form-row"><label>WhatsApp<input value={settingsData.whatsapp || ''} onChange={(e) => setSettingsData({ ...settingsData, whatsapp: e.target.value })} placeholder="+243…" /></label><label>E-mail support<input type="email" value={settingsData.support_email || ''} onChange={(e) => setSettingsData({ ...settingsData, support_email: e.target.value })} /></label></div>
              <div className="payment-config-grid"><div><h3>Airtel Money</h3><label>Numéro<input value={settingsData.airtel_money_number || ''} onChange={(e) => setSettingsData({ ...settingsData, airtel_money_number: e.target.value })} /></label><label>Nom du compte<input value={settingsData.airtel_money_name || ''} onChange={(e) => setSettingsData({ ...settingsData, airtel_money_name: e.target.value })} /></label></div><div><h3>M-Pesa</h3><label>Numéro<input value={settingsData.mpesa_number || ''} onChange={(e) => setSettingsData({ ...settingsData, mpesa_number: e.target.value })} /></label><label>Nom du compte<input value={settingsData.mpesa_name || ''} onChange={(e) => setSettingsData({ ...settingsData, mpesa_name: e.target.value })} /></label></div></div>
              <p className="form-note">Ces numéros sont visibles par les clients uniquement pour le paiement manuel. Les API Airtel Money/M-Pesa seront branchées séparément avec des identifiants marchands.</p>
              <button className="primary-button" disabled={busy} type="submit"><Save size={17} /> Enregistrer les paramètres</button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
