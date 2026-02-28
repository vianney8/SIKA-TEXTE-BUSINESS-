# SIKA TEXTE BUSINESS

## Vue d'ensemble

Plateforme financière mobile-first (React + Express + PostgreSQL) où les utilisateurs gagnent des FCFA en corrigeant des phrases, effectuent des transferts/retraits, et accèdent à des commissions de parrainage. La plateforme dispose de rôles utilisateur/admin avec KYC, plusieurs intégrations de passerelles de paiement, et un flux d'activation de compte.

---

## Préférences utilisateur

Communication : Simple, langue française, sans jargon technique.

---

## Identité visuelle & Couleurs

### Palette principale
| Élément | Couleur | Code |
|---|---|---|
| Couleur primaire | Bleu vif | `hsl(213, 94%, 59%)` |
| Accent | Rose/Rouge | `hsl(342, 89%, 61%)` |
| Fond app | Blanc | `hsl(0, 0%, 100%)` |
| Texte principal | Bleu nuit | `hsl(222, 47%, 11%)` |
| Bordures | Gris clair | `hsl(214, 32%, 91%)` |

### Dégradés clés (hardcodés dans les composants)
| Composant | Dégradé |
|---|---|
| Header mobile / Toutes les en-têtes | `linear-gradient(135deg, #1a237e 0%, #283593 40%, #1565c0 100%)` |
| Pointage quotidien (Dashboard) | `linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #a855f7 100%)` |
| En-tête page CI Update | `linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)` |
| Bouton principal CI Update | `linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)` |
| Bouton paiement CI Update (vert) | `linear-gradient(135deg, #059669 0%, #10b981 100%)` |
| Arrière-plan page CI Update | `linear-gradient(160deg, #f0f4ff 0%, #f8f9ff 40%, #fdf4ff 100%)` |
| Admin pages (fond) | `linear-gradient(to bottom, primary, blue-600)` |
| Balance card Dashboard | Bleu dégradé |

### Rayon de bordure global
- `--radius: 12px` (arrondi standard)
- Cards principales : `rounded-2xl` (16px)
- Boutons : `rounded-xl` à `rounded-2xl`

---

## Configuration du site (app_settings)

Ces paramètres sont **auto-seedés au démarrage** du serveur (ON CONFLICT DO NOTHING) :

| Clé | Valeur actuelle | Description |
|---|---|---|
| `activation_amount` | `3600` | Frais d'activation du compte (FCFA) |
| `activation_link` | *(à configurer)* | Lien passerelle activation |
| `ci_update_required` | `true` | Mise à jour +225 CI requise |
| `ci_update_link` | `https://clp.ci/ETPXwo` | Lien paiement mise à jour CI |
| `ci_update_amount` | `1200` | Frais mise à jour CI (FCFA) |
| `telegram_group` | `https://t.me/+A1QL2HAVBkMyMDA0` | Groupe Telegram |
| `whatsapp_group` | `https://whatsapp.com/channel/0029VbC6vZ33bbV4eIeyXJ0T` | Groupe WhatsApp |
| `telegram_supervisor` | `https://t.me/@SIKAcustomer_service` | Superviseur Telegram |
| `telegram_supervisor_enabled` | `false` | |
| `instagram_supervisor` | `superviseur_st` | Compte Instagram service client |
| `instagram_supervisor_enabled` | `true` | |
| `whatsapp_supervisor` | *(à configurer)* | WhatsApp service client |
| `telegram_admin_chat_id` | `7457302722` | Chat ID admin Telegram |
| `chat_enabled` | `true` | Chat en ligne activé |
| `withdrawal_video_url` | `/withdrawal-video.mp4` | Vidéo page activation |
| `solvexpay_enabled` | `true` | Passerelle SolvexPay active |
| `lygos_enabled` | `false` | |
| `bkapay_enabled` | `false` | |
| `leekpay_enabled` | `false` | |
| `sendavapay_enabled` | `false` | |

---

## Secrets d'environnement requis

Ces secrets **doivent être reconfigurés manuellement** si le projet est déplacé :

| Secret | Usage |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram — notifications admin CI update |
| `SENDAVAPAY_API_KEY` | Clé API passerelle SendavaPay |
| `SENDAVAPAY_WEBHOOK_SECRET` | Secret webhook SendavaPay |
| `DATABASE_URL` | URL de connexion PostgreSQL (Neon) |

### Bot Telegram
- Webhook enregistré automatiquement au démarrage sur : `https://sikatexte.site/api/telegram/ci-webhook`
- Chat ID admin : `7457302722`
- **Important** : L'admin doit envoyer au moins un message au bot pour que Telegram autorise les notifications sortantes

---

## Domaine de production

`https://sikatexte.site`

---

## Architecture technique

### Frontend
- **Framework** : React 18 + TypeScript
- **Routing** : Wouter
- **État serveur** : TanStack Query v5
- **UI** : Shadcn/ui + Radix UI + Tailwind CSS
- **Build** : Vite
- **Formulaires** : React Hook Form + Zod

### Backend
- **Runtime** : Node.js + Express.js + TypeScript
- **ORM** : Drizzle ORM
- **Auth** : Replit Auth (OIDC)
- **Sessions** : connect-pg-simple (PostgreSQL)

### Base de données
- **Type** : PostgreSQL (Neon serverless)
- **Tables principales** :
  - `users` — profils, solde, codes de parrainage
  - `transactions` — toutes les opérations financières
  - `account_status` — statut d'activation par utilisateur
  - `app_settings` — paramètres de configuration (auto-seedés)
  - `referrals` — parrainage et commissions
  - `ci_updates` — demandes de mise à jour CI
  - `support_messages` — chat support
  - `sessions` — sessions d'authentification

---

## Flux principaux

### Activation de compte (3 600 FCFA)
1. Utilisateur clique "Activer mon compte" sur la page Retrait
2. Choix de passerelle de paiement (SolvexPay active par défaut)
3. Redirection vers la passerelle
4. Retour sur `/activation-success` → compte activé

### Mise à jour CI (+225 — 1 200 FCFA)
1. Utilisateur +225 avec compte actif non à jour est redirigé vers `/ci-update`
2. Saisit son numéro Mobile Money → soumission
3. Bot Telegram notifie l'admin (chat_id 7457302722) avec boutons Accepter/Décliner
4. Admin clique Accepter → compte débloqué automatiquement
5. Lien de paiement affiché : `https://clp.ci/ETPXwo`

### Pointage quotidien
- Bonus : 300–800 FCFA aléatoire par jour
- Accessible depuis le Dashboard (bouton violet indigo)

### Parrainage
- Code unique par utilisateur (`referralCode`)
- Commission versée au parrain lors de l'activation du filleul

---

## Pages & Routes

| Route | Page | Accès |
|---|---|---|
| `/` | Dashboard | Utilisateur authentifié |
| `/work` | Correction de textes | Utilisateur |
| `/transfer` | Transfert | Utilisateur |
| `/withdrawal` | Retrait / Activation | Utilisateur |
| `/ci-update` | Mise à jour compte CI | Utilisateur +225 non à jour |
| `/transactions` | Historique | Utilisateur |
| `/referral` | Parrainage | Utilisateur |
| `/assistance` | Support chat | Utilisateur |
| `/admin` | Dashboard Admin | Admin uniquement |
| `/admin/ci-update` | Gestion mises à jour +225 | Admin |
| `/admin/withdrawals` | Gestion retraits | Admin |

---

## Passerelles de paiement

### SolvexPay (active par défaut)
- Activation compte : `solvexpay_enabled = true`

### BKAPay
- Webhook : `https://sikatexte.site/api/webhook/bkapay`
- Variables : `BKAPAY_PUBLIC_KEY`, `BKAPAY_SIGNATURE_SECRET`

### Lygos
- Base URL : `https://api.lygosapp.com/v1/`
- Variable : `LYGOS_API_KEY`

### LeekPay
- Base URL : `https://leekpay.fr/api/v1/`
- Webhook : `https://sikatexte.site/api/webhook/leekpay`
- Variables : `LEEKPAY_SECRET_KEY`, `LEEKPAY_PUBLIC_KEY`

### SendavaPay
- Variables : `SENDAVAPAY_API_KEY`, `SENDAVAPAY_WEBHOOK_SECRET`

---

## Chat Support
- Temps réel (polling)
- Support images base64 (max 5 Mo)
- Admin peut modifier/supprimer ses messages
- Indicateur de messages non lus

---

## Checklist si déplacement du projet

Quand le projet est déplacé vers un autre compte Replit :

- [ ] Reconfigurer les secrets : `TELEGRAM_BOT_TOKEN`, `SENDAVAPAY_API_KEY`, `SENDAVAPAY_WEBHOOK_SECRET`, `DATABASE_URL`
- [ ] Lancer les migrations : `npm run db:push`
- [ ] Les paramètres `app_settings` se recréent automatiquement au 1er démarrage
- [ ] Envoyer un `/start` au bot Telegram depuis le compte admin pour activer les notifications
- [ ] Mettre à jour le domaine dans `server/index.ts` si différent de `sikatexte.site`
- [ ] Reconfigurer Replit Auth (lié au Repl ID)
