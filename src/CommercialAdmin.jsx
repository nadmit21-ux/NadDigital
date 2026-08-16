import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, BadgeCheck, ExternalLink, Mail, MapPin,
  MessageCircle, Save, Settings2, ShieldCheck, Smartphone,
} from 'lucide-react'
import { supabase } from './supabase.js'

export default function CommercialAdmin() {
  const [session, setSession] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    const check = async (nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession?.user) { setAuthorized(false); setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', nextSession.user.id).maybeSingle()
      if (!active) return
      const admin = profile?.role === 'admin'
      setAuthorized(admin)
      if (admin) {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single()
        if (active) setSettings(data)
      }
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => check(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => check(nextSession))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const completeness = useMemo(() => {
    if (!settings) return 0
    const values = [settings.support_email, settings.whatsapp, settings.business_location, settings.business_hours, settings.service_area]
    return Math.round(values.filter(Boolean).length / values.length * 100)
  }, [settings])

  const save = async (event) => {
    event.preventDefault()
    if (!settings || busy) return
    setBusy(true)
    setMessage('')
    const allowed = {
      support_email: settings.support_email || null,
      whatsapp: settings.whatsapp || null,
      business_location: settings.business_location || null,
      business_hours: settings.business_hours || null,
      service_area: settings.service_area || null,
      facebook_url: settings.facebook_url || null,
      instagram_url: settings.instagram_url || null,
      tiktok_url: settings.tiktok_url || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('store_settings').update(allowed).eq('id', 1)
    setMessage(error ? error.message : 'Informations commerciales enregistrées. Le footer et les pages publiques sont à jour.')
    setBusy(false)
  }

  if (loading) return <div className="commercial-admin-loader">Vérification du compte…</div>
  if (!session || !authorized) return <main className="commercial-admin-locked"><ShieldCheck size={42} /><h1>Paramètres commerciaux privés</h1><p>Connectez-vous d’abord avec le compte propriétaire NadDigital.</p><a href="#/admin">Ouvrir l’administration</a></main>

  return <div className="commercial-admin-app">
    <header><a href="#/admin"><ArrowLeft size={17} /> Administration</a><a href="#/" target="_self"><ExternalLink size={17} /> Voir la boutique</a></header>
    <main>
      <section className="commercial-admin-title"><span><BadgeCheck size={16} /> Confiance commerciale</span><h1>Contacts & identité publique</h1><p>Ces informations apparaissent sur la page Contact, les pages de confiance et le footer de NadDigital.</p></section>

      <section className="commercial-health"><div><strong>{completeness}%</strong><span>profil de contact complété</span></div><p>Ne renseignez que des coordonnées que vous souhaitez réellement rendre publiques.</p></section>

      <form className="commercial-admin-form" onSubmit={save}>
        <div className="commercial-admin-section">
          <div className="commercial-admin-section-title"><MessageCircle /><div><h2>Contact direct</h2><p>Canaux affichés aux clients.</p></div></div>
          <div className="commercial-admin-row"><label><Mail size={15} /> E-mail support<input type="email" value={settings?.support_email || ''} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })} placeholder="support@exemple.com" /></label><label><MessageCircle size={15} /> WhatsApp<input value={settings?.whatsapp || ''} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} placeholder="+243…" /></label></div>
        </div>

        <div className="commercial-admin-section">
          <div className="commercial-admin-section-title"><MapPin /><div><h2>Présence commerciale</h2><p>Localisation générale et disponibilité. N’utilisez pas une adresse privée si vous ne souhaitez pas la publier.</p></div></div>
          <label>Localisation publique<input value={settings?.business_location || ''} onChange={(e) => setSettings({ ...settings, business_location: e.target.value })} placeholder="Ex. Likasi, Haut-Katanga, RDC" /></label>
          <div className="commercial-admin-row"><label>Horaires / disponibilité<input value={settings?.business_hours || ''} onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })} placeholder="Ex. Lun–Sam, 08h00–18h00" /></label><label><Smartphone size={15} /> Zone de service<input value={settings?.service_area || ''} onChange={(e) => setSettings({ ...settings, service_area: e.target.value })} placeholder="RDC & international" /></label></div>
        </div>

        <div className="commercial-admin-section">
          <div className="commercial-admin-section-title"><Settings2 /><div><h2>Réseaux sociaux</h2><p>Laissez vide tout réseau que vous ne souhaitez pas afficher.</p></div></div>
          <label><ExternalLink size={15} /> Facebook<input value={settings?.facebook_url || ''} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} placeholder="https://facebook.com/…" /></label>
          <label><ExternalLink size={15} /> Instagram<input value={settings?.instagram_url || ''} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} placeholder="https://instagram.com/…" /></label>
          <label><ExternalLink size={15} /> TikTok<input value={settings?.tiktok_url || ''} onChange={(e) => setSettings({ ...settings, tiktok_url: e.target.value })} placeholder="https://tiktok.com/@…" /></label>
        </div>

        <button className="commercial-save" type="submit" disabled={busy}><Save size={17} /> {busy ? 'Enregistrement…' : 'Enregistrer les informations publiques'}</button>
        {message && <p className="commercial-admin-message">{message}</p>}
      </form>
    </main>
  </div>
}
