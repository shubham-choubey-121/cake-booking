# Cake Booking App (MERN)

Full-stack mini cake booking platform with role-based workflows:
- User: browse cakes and book with COD
- Admin: upload cake images to Cloudinary + manage cakes
- Manager/Admin: view bookings dashboard, approve/cancel bookings, top-cake stats

## Tech Stack
- Frontend: Next.js (Pages Router) + TypeScript + Axios
- Backend: Express + TypeScript + MongoDB + Redis + JWT
- Uploads: Cloudinary
- Infra: Docker Compose (MongoDB + Redis + Backend)

## Folder Structure
- frontend/ - Next.js UI and pages
- backend/ - Express APIs, models, middleware, tests
- docker-compose.yml - local containers

## Required Pages
- /login
- /signup
- /cakes
- /dashboard
- /admin

## Frontend File-based Routing
- pages/index.tsx -> /
- pages/login/index.tsx -> /login
- pages/signup/index.tsx -> /signup
- pages/cakes/index.tsx -> /cakes
- pages/dashboard/index.tsx -> /dashboard
- pages/admin/index.tsx -> /admin
- pages/_app.tsx -> shared app wrapper

## Backend Routes
- Auth
  - POST /auth/signup
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/logout
- Cakes (Admin for write ops)
  - GET /cakes
  - POST /cakes
  - PUT /cakes/:id
  - DELETE /cakes/:id
- Bookings
  - POST /bookings (User only, COD only)
  - GET /bookings (Manager/Admin)
  - PATCH /bookings/:id/status (Manager/Admin)
  - GET /bookings/top-cakes (Manager/Admin)

## Run with Docker
1. Update Cloudinary values in backend/.env.
2. From project root, run:

```bash
cd
```

3. Start frontend separately:

```bash
cd frontend
npm run dev
```

## Run Locally (without Docker)
1. Backend:

```bash
cd backend
cp .env.example .env
# set MONGO_URI and REDIS_URL to localhost values
npm install
npm run dev
```

2. Frontend:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Auth Design
- Access token: short-lived (~15m), stored in frontend memory
- Refresh token: long-lived (~7d), stored in httpOnly cookie
- Refresh tokens are rotated and tracked in Redis (plus user token history)

## Tests
- Backend tests (minimal):

```bash
cd backend
npm test
```
