import { useEffect, useState } from 'react'
import {
  ArrowLeft, BadgeCheck, BookOpen, CheckCircle2, Clock3, Download, FileText,
  HelpCircle, LockKeyhole, Mail, MapPin, MessageCircle, RefreshCw, Scale,
  ShieldCheck, ShoppingBag, Smartphone, Truck,
} from 'lucide-react'
import { supabase } from './supabase.js'
import CommercialFooter from './CommercialFooter.jsx'

const UPDATED_AT = '16 août 2026'

const PAGE_META = {
  'a-propos': { kicker: 'NadDigital', title: 'À propos', subtitle: 'Une boutique numérique conçue pour vendre et livrer des contenus et services avec un parcours clair.' },
  faq: { kicker: 'Aide', title: 'Questions fréquentes', subtitle: 'Paiement, commande, livraison, téléchargement et assistance : les réponses essentielles.' },
  conditions: { kicker: 'Informations légales', title: 'Conditions d’achat', subtitle: 'Les règles qui encadrent les commandes de produits numériques et de services sur NadDigital.' },
  confidentialite: { kicker: 'Protection des données', title: 'Politique de confidentialité', subtitle: 'Les informations collectées, leur utilisation et les choix dont vous disposez.' },
  'remboursement-livraison': { kicker: 'Après l’achat', title: 'Remboursement & livraison numérique', subtitle: 'Quand un fichier devient disponible, comment il est remis et dans quels cas contacter NadDigital.' },
  contact: { kicker: 'Assistance', title: 'Contacter NadDigital', subtitle: 'Une question sur un achat, un téléchargement ou un service ? Utilisez le canal qui vous convient.' },
}

function PageHeader({ page, brand }) {
  const meta = PAGE_META[page] || PAGE_META['a-propos']
  return (
    <>
      <header className="commercial-header">
        <a className="commercial-brand" href="#/"><span>N</span><strong>{brand || 'NadDigital'}</strong></a>
        <a className="commercial-back" href="#/"><ArrowLeft size={17} /> Boutique</a>
      </header>
      <section className="commercial-hero">
        <span>{meta.kicker}</span>
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </section>
    </>
  )
}

const FAQS = [
  ['Quels moyens de paiement sont acceptés ?', 'NadDigital peut proposer Airtel Money, M-Pesa ou une confirmation manuelle selon les moyens activés dans la boutique. Le moyen réellement disponible est affiché au checkout.'],
  ['NadDigital me demandera-t-il mon code PIN Mobile Money ?', 'Non. Le code PIN reste strictement personnel. NadDigital demande uniquement les informations nécessaires à la commande et, pour un paiement manuel, la référence de transaction.'],
  ['Comment savoir si mon paiement a été validé ?', 'Utilisez la page « Suivre ma commande » avec votre numéro ND et l’e-mail ou téléphone utilisé lors de l’achat. Le statut évolue de la commande reçue jusqu’à la livraison.'],
  ['Comment recevoir un e-book, une musique ou un pack ?', 'Après validation du paiement, le produit numérique peut devenir disponible dans la page de suivi. Lorsqu’un fichier privé est attaché, un bouton de téléchargement sécurisé apparaît.'],
  ['Combien de temps le lien de téléchargement reste-t-il actif ?', 'Le lien sécurisé est généré à la demande pour une courte durée. S’il expire, revenez sur la page de suivi et générez-en un nouveau.'],
  ['Puis-je partager mon lien de téléchargement ?', 'Le lien est destiné au client qui a acheté le produit. Le partage non autorisé d’un contenu acheté peut enfreindre les droits associés au produit.'],
  ['Que faire si le fichier ne s’ouvre pas ?', 'Contactez NadDigital avec votre numéro de commande. Si le fichier livré est défectueux ou inaccessible, une solution de remplacement peut être fournie après vérification.'],
  ['Comment fonctionne une commande de service ?', 'Après la commande et, le cas échéant, le paiement, NadDigital vous contacte pour confirmer le besoin, les éléments à fournir, le périmètre et les modalités de réalisation.'],
  ['Puis-je demander un remboursement ?', 'Les demandes sont étudiées selon la nature du produit, l’état de livraison, le travail déjà commencé et les droits obligatoires applicables. Consultez la politique « Remboursement & livraison » pour les détails.'],
  ['Comment contacter NadDigital ?', 'L’e-mail support, WhatsApp et les autres coordonnées configurées sont affichés sur la page Contact et dans le footer de la boutique.'],
]

function AboutPage() {
  return <div className="commercial-body">
    <section className="commercial-intro-card"><BadgeCheck /><div><h2>Une expérience simple côté client, contrôlable côté propriétaire.</h2><p>NadDigital rassemble des e-books, contenus audio, services numériques et packs. Le parcours est construit autour de quatre éléments : découvrir, commander, payer, puis suivre et recevoir.</p></div></section>
    <div className="commercial-card-grid">
      <article><BookOpen /><h3>Produits numériques</h3><p>Des ressources téléchargeables présentées avec une fiche produit, un prix, une description et des modalités de livraison.</p></article>
      <article><ShieldCheck /><h3>Paiement traçable</h3><p>Les commandes Mobile Money enregistrent une référence de transaction et passent par une étape de vérification avant validation.</p></article>
      <article><Truck /><h3>Suivi de commande</h3><p>Chaque commande reçoit un identifiant ND qui permet au client de consulter son état avec une seconde information de vérification.</p></article>
      <article><LockKeyhole /><h3>Livraison privée</h3><p>Les fichiers payants peuvent être remis par des liens temporaires plutôt que par une adresse publique permanente.</p></article>
    </div>
    <section className="commercial-copy"><h2>Notre approche</h2><p>NadDigital privilégie des informations visibles avant l’achat : prix, contenu annoncé, moyen de paiement, état de commande et modalités de livraison. Lorsqu’un service nécessite un cadrage supplémentaire, la réalisation est confirmée avec le client avant de considérer la prestation comme terminée.</p><p>La boutique peut servir des clients en RDC et à l’international selon les moyens de paiement et de livraison effectivement disponibles.</p></section>
  </div>
}

function FaqPage() {
  const [open, setOpen] = useState(0)
  return <div className="commercial-body"><div className="faq-list">{FAQS.map(([question, answer], index) => <article className={open === index ? 'open' : ''} key={question}><button onClick={() => setOpen(open === index ? -1 : index)}><span>{question}</span><HelpCircle size={18} /></button>{open === index && <p>{answer}</p>}</article>)}</div></div>
}

function TermsPage() {
  return <div className="commercial-body commercial-copy">
    <p className="policy-date">Dernière mise à jour : {UPDATED_AT}</p>
    <h2>1. Objet</h2><p>Les présentes conditions décrivent le fonctionnement des achats effectués sur NadDigital : produits numériques, contenus audio, packs et prestations de service. En passant commande, le client confirme avoir pris connaissance des informations affichées au checkout et des conditions applicables au produit ou service choisi.</p>
    <h2>2. Informations produit et prix</h2><p>Le prix, la devise, la description et les éléments inclus sont indiqués sur la fiche produit. Le montant final d’une commande est recalculé côté serveur au moment de son enregistrement. Une erreur manifeste de prix ou une indisponibilité peut nécessiter l’annulation ou la correction de la commande avant exécution.</p>
    <h2>3. Commande</h2><p>Une commande est enregistrée lorsqu’un numéro commençant par « ND- » est généré. Ce numéro doit être conservé. L’enregistrement de la commande ne signifie pas automatiquement que le paiement a été confirmé.</p>
    <h2>4. Paiement manuel Mobile Money</h2><p>Lorsque Airtel Money ou M-Pesa est disponible, le client effectue lui-même le transfert vers les coordonnées affichées puis transmet la référence de transaction. NadDigital ne demande jamais le code PIN du compte Mobile Money. Une référence reçue peut être placée en statut « À vérifier » jusqu’au contrôle du paiement.</p>
    <h2>5. Livraison</h2><p>Les produits numériques payés peuvent être livrés via la page de suivi sous forme de lien temporaire. Les services sont réalisés selon le périmètre et les modalités confirmés avec le client. Les délais peuvent dépendre de la nature du produit, de la validation du paiement et des informations fournies par le client.</p>
    <h2>6. Utilisation des contenus</h2><p>Sauf indication différente sur la fiche produit, l’achat donne au client un droit d’utilisation du contenu livré et ne transfère pas automatiquement les droits de propriété intellectuelle. La revente, redistribution ou publication intégrale d’un produit acheté n’est pas autorisée sans permission explicite.</p>
    <h2>7. Responsabilité et disponibilité</h2><p>NadDigital s’efforce de maintenir la boutique et les fichiers accessibles, mais un service en ligne peut subir des interruptions techniques. En cas de problème de livraison, le client est invité à contacter le support avec son numéro de commande afin qu’une solution raisonnable soit recherchée.</p>
    <h2>8. Règles impératives</h2><p>Aucune disposition de ces conditions n’a pour objet de supprimer un droit auquel le client ne peut légalement renoncer. Si une règle obligatoire applicable à une transaction prévoit une protection supérieure, cette règle prévaut.</p>
    <h2>9. Contact</h2><p>Pour une question concernant une commande, un paiement ou ces conditions, utilisez les coordonnées officielles affichées sur la page Contact.</p>
  </div>
}

function PrivacyPage() {
  return <div className="commercial-body commercial-copy">
    <p className="policy-date">Dernière mise à jour : {UPDATED_AT}</p>
    <h2>1. Données traitées</h2><p>Lors d’une commande ou d’un contact, NadDigital peut traiter notamment votre nom, adresse e-mail, téléphone/WhatsApp, numéro de commande, produits commandés, montant, moyen de paiement, référence de transaction, note de commande et messages envoyés au support.</p>
    <h2>2. Pourquoi ces données sont utilisées</h2><p>Ces informations servent à enregistrer et suivre les commandes, vérifier les paiements, livrer les produits ou services, répondre aux demandes de support, prévenir les abus et conserver les informations nécessaires à la gestion commerciale.</p>
    <h2>3. Stockage et prestataires techniques</h2><p>La boutique utilise des services techniques tiers pour l’hébergement du site, la base de données, l’authentification et le stockage des fichiers. Les données ne sont pas publiées volontairement comme un catalogue public de clients. Les fichiers numériques vendus sont stockés séparément des couvertures publiques.</p>
    <h2>4. Panier et stockage local</h2><p>Le navigateur peut utiliser son stockage local pour conserver temporairement le panier et certaines informations techniques nécessaires au fonctionnement de l’application. Supprimer les données du site dans le navigateur peut effacer ce panier local.</p>
    <h2>5. Paiement Mobile Money</h2><p>NadDigital ne demande pas le code PIN Mobile Money. Pour une vérification manuelle, seule la référence de transaction et les informations de commande nécessaires au rapprochement du paiement sont demandées.</p>
    <h2>6. Durée de conservation</h2><p>Les informations sont conservées pendant la durée raisonnablement nécessaire au traitement de la commande, au support, à la sécurité, à la gestion commerciale et aux obligations applicables. La durée peut varier selon la nature de l’information et les exigences légales ou comptables pertinentes.</p>
    <h2>7. Vos demandes</h2><p>Vous pouvez contacter NadDigital pour demander l’accès, la correction ou, lorsque cela est possible, la suppression de données vous concernant. Certaines informations peuvent devoir être conservées lorsqu’une obligation légale, une preuve de transaction ou un besoin de sécurité le justifie.</p>
    <h2>8. Sécurité</h2><p>NadDigital utilise notamment des contrôles d’accès, une authentification propriétaire et des liens temporaires pour les fichiers privés. Aucun système connecté à Internet ne peut toutefois garantir un risque nul.</p>
  </div>
}

function RefundPage() {
  return <div className="commercial-body commercial-copy">
    <p className="policy-date">Dernière mise à jour : {UPDATED_AT}</p>
    <h2>1. Produits numériques non encore livrés</h2><p>Si un paiement a été confirmé mais que le fichier ne peut pas être livré, contactez NadDigital avec votre numéro de commande. La priorité est de rétablir la livraison ou fournir un fichier de remplacement approprié.</p>
    <h2>2. Fichier défectueux ou non conforme</h2><p>Si le fichier livré est corrompu, inaccessible ou ne correspond pas matériellement à la description annoncée, signalez le problème. Après vérification, NadDigital peut remplacer le fichier, corriger l’accès ou proposer une autre solution adaptée.</p>
    <h2>3. Produit numérique déjà livré</h2><p>Compte tenu de la nature reproductible des contenus numériques, une demande de remboursement après accès ou téléchargement n’est pas automatiquement acceptée. Elle est examinée selon la cause de la demande et les droits obligatoires applicables au client.</p>
    <h2>4. Paiement en double</h2><p>Un paiement manifestement effectué deux fois pour la même commande doit être signalé avec les références concernées afin de permettre la vérification et, si le doublon est confirmé, le traitement approprié.</p>
    <h2>5. Services</h2><p>Pour une prestation de service, l’éligibilité à une annulation ou à un remboursement dépend notamment du travail déjà commencé, des livrables déjà remis, des frais engagés et des conditions convenues avec le client. Un service personnalisé commencé à la demande du client peut ne pas être remboursable intégralement.</p>
    <h2>6. Délais et méthode</h2><p>Toute demande doit inclure le numéro de commande et une explication du problème. Si un remboursement est accepté, la méthode et le délai dépendent du moyen de paiement utilisé et des possibilités techniques disponibles.</p>
    <h2>7. Droits du consommateur</h2><p>Cette politique ne remplace pas les droits impératifs dont un consommateur peut bénéficier selon la loi applicable à sa transaction.</p>
    <h2>8. Livraison sécurisée</h2><p>Lorsqu’un téléchargement est disponible, NadDigital génère un lien privé de courte durée. Si le lien expire, le client peut revenir dans le suivi de commande pour en générer un nouveau tant que la commande reste autorisée.</p>
  </div>
}

function ContactPage({ settings }) {
  const [message, setMessage] = useState('')
  const whatsapp = settings?.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}` : ''

  const send = async (event) => {
    event.preventDefault()
    setMessage('')
    const form = new FormData(event.currentTarget)
    const { error } = await supabase.from('inquiries').insert({
      name: String(form.get('name') || '').trim(),
      contact: String(form.get('contact') || '').trim(),
      subject: String(form.get('subject') || '').trim(),
      message: String(form.get('message') || '').trim(),
    })
    if (error) return setMessage('Impossible d’envoyer votre message pour le moment.')
    event.currentTarget.reset()
    setMessage('Votre message a bien été transmis à NadDigital.')
  }

  return <div className="commercial-body contact-page-grid">
    <section className="contact-channel-card">
      <h2>Coordonnées officielles</h2>
      {settings?.support_email && <a href={`mailto:${settings.support_email}`}><Mail /><div><span>E-mail support</span><strong>{settings.support_email}</strong></div></a>}
      {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><div><span>WhatsApp</span><strong>{settings.whatsapp}</strong></div></a>}
      {settings?.business_location && <div className="contact-static"><MapPin /><div><span>Localisation</span><strong>{settings.business_location}</strong></div></div>}
      {settings?.business_hours && <div className="contact-static"><Clock3 /><div><span>Disponibilité</span><strong>{settings.business_hours}</strong></div></div>}
      {settings?.service_area && <div className="contact-static"><Smartphone /><div><span>Zone de service</span><strong>{settings.service_area}</strong></div></div>}
      <small>Pour une commande existante, indiquez toujours votre numéro ND afin d’accélérer la vérification.</small>
    </section>
    <form className="commercial-contact-form" onSubmit={send}>
      <h2>Envoyer un message</h2>
      <label>Nom<input name="name" required /></label>
      <label>E-mail ou téléphone<input name="contact" required /></label>
      <label>Objet<input name="subject" placeholder="Ex. problème de téléchargement" /></label>
      <label>Message<textarea name="message" rows="6" required /></label>
      <button type="submit"><MessageCircle size={17} /> Envoyer à NadDigital</button>
      {message && <p className="commercial-form-message">{message}</p>}
    </form>
  </div>
}

export default function CommercialPages({ page }) {
  const [settings, setSettings] = useState(null)
  useEffect(() => { supabase.from('store_settings').select('*').eq('id', 1).single().then(({ data }) => data && setSettings(data)) }, [])

  let content = <AboutPage />
  if (page === 'faq') content = <FaqPage />
  if (page === 'conditions') content = <TermsPage />
  if (page === 'confidentialite') content = <PrivacyPage />
  if (page === 'remboursement-livraison') content = <RefundPage />
  if (page === 'contact') content = <ContactPage settings={settings} />

  return <div className="commercial-page-app">
    <PageHeader page={page} brand={settings?.brand_name} />
    <main className="commercial-main">{content}</main>
    <section className="commercial-assurance">
      <div><ShieldCheck /><strong>Commande sécurisée</strong><span>Le prix est revérifié côté serveur.</span></div>
      <div><RefreshCw /><strong>Suivi disponible</strong><span>Le numéro ND permet de suivre la progression.</span></div>
      <div><Download /><strong>Livraison contrôlée</strong><span>Les fichiers privés utilisent des liens temporaires.</span></div>
    </section>
    <CommercialFooter compact />
  </div>
}
