<div align="center">
  <a href="https://planning.sylvain.pro"><img src="assets/images/logo.png" alt="Logo" width="25%" height="auto"/></a>

  # Planning
  [![Version](https://custom-icon-badges.demolab.com/badge/Version%20:-v1.0.0-6479ee?logo=planning.sylvain.pro&labelColor=23272A)](https://github.com/20syldev/planning/releases/latest)
</div>

---

## À propos

Ce projet de **planning** est une interface web moderne pour consulter les emplois des élèves de SLAM et SISR du BTS SIO de Ensitech.

## Fonctionnalités

- **Vue par jour** : Navigation fluide entre les jours avec swipe (mobile) ou scroll/flèches (PC)
- **Vue complète** : Affichage de tous les cours groupés par semaine
- **Cours en cours** : Indicateur visuel du cours actuel
- **Pause déjeuner** : Détection automatique des pauses repas
- **Détails des cours** : Modal avec professeur, salle, classes et notes
- **Préférences sauvegardées** : Spécialité et vue mémorisées localement
- **Rafraîchissement automatique** : Mise à jour toutes les 5 minutes
- **Responsive** : Adapté mobile et desktop

## Configuration

Modifier le fichier `config.json` avec vos URLs HyperPlanning :

```json
{
  "slam": "<URL_ICS_SLAM>",
  "sisr": "<URL_ICS_SISR>"
}
```
*Les URLs sont écrites en dur car elles sont facilement accessibles et ne comportent pas de données sensibles.*
