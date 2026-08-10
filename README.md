# ImmoPilot

Application de **gestion locative** pour bailleurs et gestionnaires (Côte d’Ivoire) : biens, unités, locataires, baux, loyers, charges, cautions, comptabilité, exports Excel/PDF.

## Structure du projet

| Dossier | Rôle |
|---------|------|
| `backend/` | API NestJS, Prisma, PostgreSQL |
| `frontend/` | Interface React (Vite + Tailwind) |
| `shared/contracts/` | Contrats partagés (optionnel) |

---

## Installation (première fois)

### Prérequis

- **Node.js** 18 ou plus
- **PostgreSQL** 14+ (base dédiée, ex. `immopilot`)
- Git (optionnel)

> Utilisez une **base PostgreSQL vide ou dédiée** à ImmoPilot. Ne réutilisez pas une ancienne base d’un autre projet (migrations incompatibles).

### 1. Base de données

Créez une base PostgreSQL :

```sql
CREATE DATABASE immopilot;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Éditez `.env` :

- `DATABASE_URL` → votre connexion PostgreSQL (`immopilot`)
- `JWT_SECRET` → chaîne longue et aléatoire (production)
- `PUBLIC_APP_URL` → URL du front (ex. `http://localhost:5173`)

Puis :

```bash
npm install
npx prisma migrate deploy
npm run seed          # compte admin + données démo (Abidjan…)
npm run start:dev
```

API : **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optionnel en local (proxy Vite)
npm run dev
```

Ouvrir **http://localhost:5173**

---

## Compte par défaut (après `npm run seed`)

| Champ | Valeur |
|-------|--------|
| E-mail | `admin@immopilot.local` |
| Mot de passe | `AdminImmo2026!` |
| Rôle | Administrateur plateforme (menu « Clients (admin) ») |

**À changer impérativement en production.**

---

## Modules disponibles

| Menu | Fonction |
|------|----------|
| Accueil | Tableau de bord, impayés, relances |
| Mes biens | Immeubles, terrains, unités |
| Locataires | Fiches locataires, pièce d’identité |
| Baux | Contrats, création rapide locataire |
| Paiements | Échéances, encaissements, filtres |
| Carte des biens | Vue carte + liste des locations |
| Calendrier loyers | Activité annuelle |
| Cautions & charges | Cautions encaissées, charges |
| Comptabilité | Synthèse, clôtures |
| Collecteurs loyers | Agents de collecte |
| Journal sécurité | Audit des actions |
| Fichiers Excel | Export / import modèle |
| Mon compte | Profil, mot de passe |

---

## Plusieurs clients (organisations)

Chaque utilisateur appartient à une **organisation**. Les données (biens, baux, paiements) sont **isolées** entre organisations.

Créer un nouveau client :

```bash
cd backend
# PowerShell :
$env:NEW_USER_EMAIL="client@example.com"
$env:NEW_USER_PASSWORD="MotDePasseFort"
$env:NEW_ORG_NAME="Nom du client"
node scripts/create-organization-user.js
```

---

## Mise en production

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

Variables importantes :

- `DATABASE_URL`, `JWT_SECRET`
- `FRONTEND_ORIGIN` → origines CORS autorisées (ex. `https://app.mondomaine.ci`)
- `PUBLIC_APP_URL` → URL publique du front (liens e-mail)
- SMTP (optionnel) : voir commentaires dans `.env.example`

### Frontend

```bash
cd frontend
# Créer .env avec VITE_API_URL=https://api.mondomaine.ci
npm run build
```

Servir le dossier `frontend/dist/` (Nginx, Apache, hébergeur statique).

---

## Vérifications avant livraison

```bash
# Frontend
cd frontend && npm run lint && npm run build

# Backend
cd backend && npm run typecheck && npm run build
```

Checklist fonctionnelle :

- [ ] Connexion admin OK
- [ ] Création d’un bien + unité
- [ ] Création locataire + bail
- [ ] Échéances visibles dans Paiements
- [ ] Export Excel téléchargeable
- [ ] Mot de passe oublié (si SMTP configuré)

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Erreur Prisma P3009 / migrations | Base incompatible : créer une base neuve `immopilot`, relancer `migrate deploy` + `seed` |
| Front ne joint pas l’API | Backend démarré sur le port 4000 ; en prod, définir `VITE_API_URL` |
| « 0 locataires » dans les filtres | Exécuter `npm run seed` ou créer des locataires dans l’app |
| E-mails non envoyés | Configurer SMTP dans `backend/.env` ou laisser `MAIL_MODE=log` (console API) |

---

## Licence

Usage privé — voir le dépôt / contrat client.
