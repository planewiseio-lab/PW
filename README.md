# PlaneWise

Fiche d’un avion à partir de son **immatriculation** (tail number).  
Site : [planewise.io](https://planewise.io)

PlaneWise affiche les données publiques disponibles pour une cellule précise — type, constructeur, âge, MSN, exploitant, statut — et, lorsqu’elle existe, **une photographie de cet avion-là**, pas d’un autre du même type.

Aucune clé API n’est requise. Il n’y a pas de backend à héberger : c’est un site Next.js qui interroge des sources publiques côté serveur.

## Lancer en local

```bash
npm i && npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), puis essayez par exemple `F-HTYA` ou `A6-EUA`.

L’interface est en français par défaut, avec un basculeur **FR | ENG** dans l’en-tête (mémorisé dans un cookie).

## Production

Déploiement standard sur Vercel (`next build`). Aucune variable d’environnement.

## Sources

Les recherches sont faites sur le serveur (pas dans le navigateur) et mises en cache quelques heures :

- [hexdb.io](https://hexdb.io/) — immatriculation, constructeur, type OACI, exploitant
- [Airport-Data.com](https://airport-data.com/) — API publique (année, MSN, pays) et fiche HTML (statut, livraison)
- [Planespotters.net Photo API](https://www.planespotters.net/photo/api) — photo de la cellule, avec crédit photographe (aucune clé)
- [Wikimedia Commons](https://commons.wikimedia.org/) — photos supplémentaires de la catégorie d’immatriculation, si elle existe

Les champs absents sont omis. PlaneWise n’invente jamais une donnée ni une photo.

## Licence des photos Planespotters

Les images Planespotters sont chargées depuis leurs URL, avec le nom du photographe et un lien vers la page source, conformément à leurs conditions d’utilisation de l’API photo.
