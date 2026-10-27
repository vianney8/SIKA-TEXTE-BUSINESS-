---
name: Group moderation policy
description: User-requested restriction directory and opt-in message filtering policy for Sika discussions.
---

L’administration des groupes doit permettre de rechercher les membres dont l’envoi est bloqué, les membres exclus et les membres exclus et bloqués, puis de lever leurs restrictions.

**Why:** l’utilisateur ne pouvait plus retrouver les personnes exclues ou bloquées dans une liste limitée aux membres actifs.

**How to apply:** conserver les restrictions existantes et les rendre consultables au-delà de la première page de résultats. Ne pas confondre un départ volontaire avec une exclusion administrative.

Lever une interdiction d’accès et réintégrer immédiatement sont deux actions distinctes. Un déblocage seul permet de rejoindre à nouveau selon les règles du groupe ; une réintégration explicite restaure une adhésion ordinaire, sans anciens privilèges administrateur.

**Why:** annuler une restriction ne doit pas contourner implicitement l’approbation des groupes privés ni rétablir des droits retirés.

**How to apply:** présenter les conséquences dans la confirmation et enregistrer de façon atomique la réintégration et son événement d’adhésion. Garder l’historique de modération cohérent avec les changements d’adhésion.

L’utilisateur a demandé un filtre activable par groupe qui refuse les messages des utilisateurs contenant notamment « arnaque », « scam », leurs synonymes et les formulations négatives sur le passage des retraits ou le site. Le refus doit afficher « Envoi impossible » sans publier le message.

**Why:** la demande est un blocage conditionnel à l’activation par un administrateur, pas une suppression rétroactive des discussions ni une règle globale permanente.

**How to apply:** préserver l’activation explicite par groupe, contrôler les nouvelles publications et les modifications côté serveur, et conserver le texte refusé dans le brouillon. Le choix actuel est un filtrage déterministe par mots et expressions ; ne pas le présenter comme un modèle d’IA comprenant toutes les nuances.
