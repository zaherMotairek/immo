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
