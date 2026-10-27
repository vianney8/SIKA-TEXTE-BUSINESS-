---
name: Group message deletion
description: User-requested differences between ordinary moderation and complete removal in discussions.
---

Une suppression ordinaire doit faire disparaître le message de la vue administrateur, y compris lorsque l’administrateur supprime son propre message. Les utilisateurs voient « Message supprimé ».

Les administrateurs doivent aussi pouvoir retirer complètement les messages des utilisateurs, sans laisser cette mention dans la conversation.

**Why:** l’utilisateur a demandé ces deux comportements distincts ; masquer seulement le contenu chez l’administrateur ne répond pas à sa demande.

**How to apply:** conserver deux actions explicites et confirmer le retrait complet. Vérifier les droits du groupe côté serveur et répercuter les suppressions dans l’historique déjà chargé ainsi que dans les citations, sans conserver de contenu retiré dans les notifications ou journaux.
