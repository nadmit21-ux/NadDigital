import { useEffect, useState } from 'react'
import {
  BadgeCheck, Clock3, Download, ExternalLink, Mail, MapPin,
  MessageCircle, ReceiptText, ShieldCheck, Smartphone,
} from 'lucide-react'
import { supabase } from './supabase.js'

const normalizeUrl = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

export default function CommercialFooter({ compact = false }) {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).single().then(({ data }) => data && setSettings(data))
  }, [])

  const brand = settings?.brand_name || 'NadDigital'
  const whatsapp = settings?.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}` : ''
  const socials = [
    settings?.facebook_url && { label: 'Facebook', href: normalizeUrl(settings.facebook_url) },
    settings?.instagram_url && { label: 'Instagram', href: normalizeUrl(settings.instagram_url) },
    settings?.tiktok_url && { label: 'TikTok', href: normalizeUrl(settings.tiktok_url) },
  ].filter(Boolean)

  return (
    <div className="trust-shell">
      {!compact && (
        <section className="trust-proof-section">
          <div className="trust-proof-heading">
            <span>Confiance & transparence</span>
            <h2>Une commande numérique que vous pouvez suivre.</h2>
            <p>NadDigital sépare la commande, la vérification du paiement et la livraison afin que chaque étape reste visible.</p>
          </div>
          <div className="trust-proof-grid">
            <article><ReceiptText /><strong>Commande traçable</strong><p>Chaque achat reçoit un numéro ND utilisable dans la page de suivi.</p></article>
            <article><ShieldCheck /><strong>Paiement vérifié</strong><p>Les références Airtel Money/M-Pesa sont contrôlées avant validation.</p></article>
            <article><Download /><strong>Fichiers privés</strong><p>Les produits numériques sont remis par des liens temporaires après paiement.</p></article>
            <article><Smartphone /><strong>PIN jamais demandé</strong><p>NadDigital ne demande jamais le code PIN Mobile Money d’un client.</p></article>
          </div>
        </section>
      )}

      <footer className="pro-footer">
        <div className="pro-footer-grid">
          <section className="pro-footer-brand">
            <a className="pro-brand" href="#/"><span>N</span><strong>{brand}</strong></a>
            <p>{settings?.tagline || 'Produits, contenus et services numériques.'}</p>
            <div className="pro-footer-badges"><span><BadgeCheck size={15} /> Paiements suivis</span><span><Download size={15} /> Livraison sécurisée</span></div>
          </section>

          <section>
            <h3>Découvrir</h3>
            <nav><a href="#/">Boutique</a><a href="#/a-propos">À propos</a><a href="#/faq">FAQ</a><a href="#/suivi">Suivre une commande</a></nav>
          </section>

          <section>
            <h3>Informations</h3>
            <nav><a href="#/conditions">Conditions d’achat</a><a href="#/confidentialite">Confidentialité</a><a href="#/remboursement-livraison">Remboursement & livraison</a><a href="#/contact">Contact</a></nav>
          </section>

          <section className="pro-footer-contact">
            <h3>Nous contacter</h3>
            {settings?.support_email && <a href={`mailto:${settings.support_email}`}><Mail size={16} /><span>{settings.support_email}</span></a>}
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} /><span>WhatsApp {settings.whatsapp}</span></a>}
            {settings?.business_location && <span><MapPin size={16} /> {settings.business_location}</span>}
            {settings?.business_hours && <span><Clock3 size={16} /> {settings.business_hours}</span>}
            {settings?.service_area && <small>Zone de service : {settings.service_area}</small>}
          </section>
        </div>

        {socials.length > 0 && <div className="pro-socials">{socials.map(({ label, href }) => <a key={label} href={href} target="_blank" rel="noreferrer"><ExternalLink size={17} /> {label}</a>)}</div>}

        <div className="pro-footer-bottom">
          <span>© {new Date().getFullYear()} {brand}. Tous droits réservés.</span>
          <span>Produits et services numériques • RDC & international</span>
          <a href="#/admin">Espace propriétaire</a>
        </div>
      </footer>
      {whatsapp && !compact && <a className="whatsapp-trust-fab" href={`${whatsapp}?text=${encodeURIComponent('Bonjour NadDigital, j’ai une question concernant votre boutique.')}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>}
    </div>
  )
}
