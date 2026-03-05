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

### Rayon de bordure global
- `--radius: 12px` (arrondi standard)
- Cards principales : `rounded-2xl` (16px)
- Boutons : `rounded-xl` à `rounded-2xl`

---

## Secrets d'environnement requis

Ces secrets **doivent être reconfigurés manuellement** si le projet est déplacé :

| Secret | Usage |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL (Neon) |
| `SOLVEXPAY_API_KEY` | Clé API SolvexPay (conservée pour compatibilité) |
| `SOLVEXPAY_WEBHOOK_SECRET` | Secret signature HMAC-SHA256 webhook SolvexPay |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram — notifications admin CI update |

---

## Configuration du site (app_settings)

Ces paramètres sont **auto-seedés au démarrage** du serveur (`ON CONFLICT DO NOTHING`) et configurables depuis la page Admin :

| Clé | Description |
|---|---|
| `activation_amount` | Frais d'activation du compte (FCFA), défaut : `3600` |
| `activation_link` | Lien passerelle BKAPay pour l'activation |
| `solvexpay_enabled` | Activer/désactiver la passerelle SolvexPay (`true`/`false`) |
| `solvexpay_name` | Nom affiché pour le bouton SolvexPay |
| `solvexpay_link` | **Lien de paiement SolvexPay** (créé dans le dashboard SolvexPay → Liens de Paiement) |
| `bkapay_enabled` | Activer/désactiver BKAPay (`true`/`false`) |
| `bkapay_name` | Nom affiché pour le bouton BKAPay |
| `ci_update_required` | Mise à jour +225 CI requise (`true`/`false`) |
| `ci_update_link` | Lien paiement mise à jour CI |
| `ci_update_amount` | Frais mise à jour CI (FCFA), défaut : `1200` |
| `telegram_group` | Lien groupe Telegram |
| `whatsapp_group` | Lien groupe WhatsApp |
| `telegram_supervisor` | Lien superviseur Telegram |
| `telegram_supervisor_enabled` | Activer le service client Telegram |
| `instagram_supervisor` | Compte Instagram service client |
| `instagram_supervisor_enabled` | Activer le service client Instagram |
| `whatsapp_supervisor` | WhatsApp service client |
| `telegram_admin_chat_id` | Chat ID admin Telegram pour notifications |
| `chat_enabled` | Chat en ligne activé (`true`/`false`) |
| `withdrawal_video_url` | URL vidéo page activation |
| `whatsapp_admin_contact` | WhatsApp admin (contact mise à jour) |

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
  - `bkapay_payments` — paiements SolvexPay/BKAPay (champ `reference` = ID de session, `redirect_url` = ID transaction)
  - `ci_updates` — demandes de mise à jour CI
  - `support_messages` — chat support
  - `sessions` — sessions d'authentification

---

## Flux principaux

### Activation de compte (3 600 FCFA)

#### SolvexPay (lien de paiement)
1. Utilisateur clique le bouton SolvexPay
2. Backend génère un ID de référence unique (`SVX-XXXXXXXX-TIMESTAMP`)
3. Crée un enregistrement `pending` dans `bkapay_payments` avec cet ID
4. Redirige vers `solvexpay_link?reference=SVX-XXXXXXXX-TIMESTAMP`
5. L'utilisateur saisit lui-même son numéro sur la page SolvexPay (rien de pré-rempli)
6. SolvexPay appelle le webhook `POST /api/webhook/solvexpay` avec `transaction.reference`
7. Le webhook retrouve le paiement par `reference` → active le compte

#### BKAPay (lien direct)
1. Utilisateur clique le bouton BKAPay
2. Redirection directe vers `activation_link`

### Webhook SolvexPay (`POST /api/webhook/solvexpay`)
- Signature HMAC-SHA256 vérifiée via `SOLVEXPAY_WEBHOOK_SECRET`
- Lookup par `transaction.reference` (primaire — lien de paiement)
- Lookup par `bkapay_payments.redirect_url = transaction.id` (fallback — anciennes transactions API)
- URL : `https://sikatexte.site/api/webhook/solvexpay`
- **À configurer dans le dashboard SolvexPay**

### Mise à jour CI (+225 — 1 200 FCFA)
1. Utilisateur +225 avec compte actif non à jour est redirigé vers `/ci-update`
2. Saisit son numéro Mobile Money → soumission
3. Bot Telegram notifie l'admin avec boutons Accepter/Décliner
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

## Checklist si déplacement du projet

Quand le projet est déplacé vers un autre compte/Repl Replit :

- [ ] Reconfigurer les secrets Replit :
  - `DATABASE_URL` (URL Neon PostgreSQL)
  - `SOLVEXPAY_API_KEY`
  - `SOLVEXPAY_WEBHOOK_SECRET`
  - `TELEGRAM_BOT_TOKEN`
- [ ] Lancer les migrations : `npm run db:push`
- [ ] Les paramètres `app_settings` se recréent automatiquement au 1er démarrage
- [ ] Dans l'Admin → configurer `solvexpay_link` avec le lien de paiement SolvexPay
- [ ] Dans l'Admin → configurer `activation_link` avec le lien BKAPay si utilisé
- [ ] Configurer le webhook SolvexPay dans le dashboard SolvexPay : `https://VOTRE-DOMAINE/api/webhook/solvexpay`
- [ ] Envoyer un `/start` au bot Telegram depuis le compte admin pour activer les notifications
- [ ] Mettre à jour le domaine dans `server/index.ts` si différent de `sikatexte.site`
- [ ] Reconfigurer Replit Auth (lié au Repl ID — les utilisateurs devront se reconnecter)

---

## Notes importantes

- Le bot Telegram : l'admin doit envoyer au moins un message au bot pour que Telegram autorise les notifications sortantes
- Telegram Admin Chat ID par défaut : `7457302722`
- SolvexPay : créer un "Lien de Paiement" de **3 600 FCFA** dans le dashboard, copier l'URL dans le paramètre `solvexpay_link`
