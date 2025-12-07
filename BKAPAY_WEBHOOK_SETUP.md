# Configuration du Webhook BKAPay v1.3 pour Activation Automatique

## 🎯 Comment Fonctionne l'Activation Automatique

Voici le flux complet:

1. **Utilisateur initie le paiement** → Clique sur "Activer mon compte"
2. **Redirection vers BKAPay** → Paiement par Wave, Orange Money, Moov, etc.
3. **BKAPay envoie un Webhook** → Notification sécurisée à votre serveur
4. **Compte activé automatiquement** → Aucune intervention manuelle
5. **Frontend reçoit la confirmation** → Affiche "Succès!" à l'utilisateur

---

## 📋 Étapes pour Configurer le Webhook

### Étape 1: Accédez au Dashboard BKAPay

- Allez sur: https://bkapay.com/dashboard
- Connectez-vous avec vos identifiants

### Étape 2: Trouvez Vos Clés API

1. Dans le menu, cliquez sur **"Clés API"**
2. Vous verrez votre clé publique: `pk_live_c5eb6cee-baa7-49b4-a375-422d92b6c264`

### Étape 3: Configurez le Webhook

1. À côté de votre clé, cliquez sur **"Configurer un callback"** (ou **"Gérer"**)
2. Dans la popup qui apparaît, entrez cette URL exacte:
   ```
   https://sikatexte.site/api/webhook/bkapay
   ```
3. **IMPORTANT**: L'URL DOIT commencer par `https://` (pas `http://`)
4. Cliquez sur **"Enregistrer"** ou **"Confirmer"**

### Étape 4: Copiez le Secret Généré

1. Après avoir enregistré l'URL du webhook, BKAPay génère automatiquement un **secret** (une longue chaîne de caractères)
2. Copiez ce secret complètement
3. Ce secret sera utilisé pour vérifier que les webhooks viennent réellement de BKAPay

### Étape 5: Ajoutez le Secret aux Variables d'Environnement

1. Dans Replit, allez à **"Secrets"** (ou **"Environment"**)
2. Créez une nouvelle variable: `BKAPAY_SIGNATURE_SECRET`
3. Collez le secret que vous avez copié à l'étape précédente
4. Cliquez sur **"Ajouter"** ou **"Enregistrer"**

---

## ✅ Vérification

Une fois configuré, testez:

1. **Paie un montant** (ex: 100 FCFA pour tester)
2. **Après le paiement**: La page affichera "Vérification en cours..."
3. **Attendez 5-10 secondes**: Le webhook arrive et l'activation se fait
4. **Voir "Succès!"**: Votre compte est maintenant activé automatiquement!

### Contrôle des Logs

Pour vérifier que tout fonctionne, regardez les logs du serveur:

- Cherchez `[BKAPAY-WEBHOOK-v1.3] ✓ PAYMENT CONFIRMED`
- Cherchez `✓ ACCOUNT AUTOMATICALLY ACTIVATED`

---

## 🔒 Sécurité

Le système vérifie:
- ✓ La signature HMAC-SHA256 du webhook
- ✓ Que le paiement existe dans notre base de données
- ✓ Que le montant correspond
- ✓ Que l'événement est `payment.completed` avec `status=completed`

---

## ❓ Problèmes Courants

### Le compte ne s'active pas?

1. **Vérifiez que le webhook est configuré**: Retournez au Dashboard BKAPay et confirmez que l'URL est bien enregistrée
2. **Attendez plus longtemps**: Les webhooks peuvent prendre 10-30 secondes
3. **Vérifiez les logs**: Regardez les logs du serveur pour voir si le webhook est reçu
4. **Testez le secret**: Assurez-vous que `BKAPAY_SIGNATURE_SECRET` est correctement défini

### Message "Vérification en cours..." qui ne change pas?

- C'est normal pendant ~10 secondes en attendant le webhook
- Si ça dépasse 1 minute, le webhook n'a peut-être pas été reçu
- Vérifiez votre configuration du dashboard BKAPay

---

## 📚 Documentation Officielles

- **BKAPay v1.3**: https://bkapay.com/documentation/v1.3
- **Webhook Docs**: Section "Webhooks - Activation automatique" dans la doc v1.3

---

## 🚀 Après Configuration

C'est tout! L'activation est maintenant **100% automatique**. Les utilisateurs qui paient seront automatiquement activés sans aucune intervention manuelle.
