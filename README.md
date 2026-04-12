# ImmoPilot

Gestion immobilière : biens, unités, locataires, baux, loyers, charges, tableau de bord.

## Structure

- `backend/` — API NestJS, Prisma, PostgreSQL  
- `frontend/` — interface React (Vite)

## Démarrage rapide

### Backend

```bash
cd backend
cp .env.example .env   # puis éditer DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate deploy
npm run seed          # optionnel : admin + données démo
npm run start:dev
```

API par défaut : http://localhost:4000  

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite (souvent http://localhost:5173).

Les variables sensibles restent dans `backend/.env` (non versionné). Voir `backend/.env.example` pour le modèle.

## Plusieurs clients sur une même base

Chaque **utilisateur** est rattaché à une **organisation** : les biens, locataires, baux et échéances sont **isolés** par organisation. Deux comptes différents ne voient jamais les données l’une de l’autre.

Après migration Prisma (`npx prisma migrate deploy`), pour **ajouter un nouveau client** (nouvelle org + compte) :

```bash
cd backend
set NEW_USER_EMAIL=client@example.com
set NEW_USER_PASSWORD=VotreMotDePasse
set NEW_ORG_NAME=Nom du client
node scripts/create-organization-user.js
```

(Sous PowerShell, utilisez `$env:NEW_USER_EMAIL="..."` etc.)

Le compte seed initial (`npm run seed`) reste sur l’organisation « Par défaut ».
