# Atelier Clair

MVP mobile-first de rapports d’inspection mécanique pour automobiles et camions légers au Québec. Il ne produit pas de certificat officiel de la SAAQ.

Chaque ligne de contrôle accepte plusieurs photos JPEG, PNG ou WebP (5 Mo maximum chacune). Deux rapports sont disponibles : un PDF détaillé avec toutes les lignes et un PDF résumé limité aux réparations requises et éléments à surveiller. Dans les deux modèles, les photos correspondantes sont regroupées dans une section séparée après les lignes d’inspection.

## Prérequis

- Node.js 20 ou plus récent
- un compte Netlify sur le plan gratuit
- un dépôt GitHub

## Installation locale

```powershell
npm install
npx netlify login
npx netlify init
npx netlify database init
npm run db:generate
npm run db:migrate
npm run netlify:dev
```

Ouvrir `http://localhost:8888`. `netlify dev` est nécessaire pour Identity, les Functions, Database et Blobs.

## Configuration Netlify

1. Créer ou relier le projet depuis GitHub.
2. Dans **Data & Storage > Database**, créer Netlify Database.
3. Dans **Project configuration > Identity**, activer Netlify Identity.
4. Activer **Email confirmations** et laisser les emails standards Netlify.
5. Définir l’inscription sur `Open` pour que les mécaniciens puissent créer un compte.
6. Déployer la branche principale. La commande `npm run build`, le dossier `dist` et les Functions sont définis dans `netlify.toml`.
7. Exécuter les migrations depuis un terminal lié au projet : `npm run db:migrate`.

Netlify configure `NETLIFY_DATABASE_URL` dans son environnement. Aucun secret ne doit utiliser le préfixe `VITE_`.

## Commandes

```powershell
npm run typecheck
npm test
npm run build
npm run netlify:dev
```

## Sécurité

Toutes les données transitent par des Netlify Functions. Le propriétaire est déduit du JWT Identity vérifié par Netlify et n’est jamais accepté depuis le navigateur. Les requêtes filtrent systématiquement par `owner_id`. Les photos sont rangées dans Netlify Blobs sous un chemin propre à l’utilisateur.

## Checklist MVP

- [ ] Inscription, confirmation email, connexion et récupération testées
- [ ] Profil mécanicien enregistré
- [ ] Brouillon créé puis rouvert
- [ ] Champs critiques exigés avant finalisation
- [ ] Recherche par client, plaque, VIN et numéro
- [ ] Duplication sans copier les résultats
- [ ] PDF lisible sur plusieurs pages
- [ ] Compte A incapable d’accéder aux données du compte B
- [ ] JPEG/PNG/WebP sous 5 Mo accepté, autres fichiers refusés
- [ ] Mise en page testée à 360 px et 1280 px

## Limite légale

Le rapport généré est un document d’atelier. Il ne remplace pas un certificat officiel de vérification mécanique délivré par un mandataire autorisé par la SAAQ.
