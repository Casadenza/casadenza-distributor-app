# Casadenza Distributor Portal (PWA) — Zoho CRM Only (MVP)

This is an installable **PWA** that works on **PC + Mobile**, designed for distributors:
- Products (specs, MOQ, lead time)
- Pricing (tier based)
- Place Order
- Order timeline
- Documents list
- Support tickets
- Admin announcements

## 1) Requirements
- Node.js 18+
- PostgreSQL (or change Prisma provider to mysql/sqlite)

## 2) Setup
```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL`
- `JWT_SECRET`

## 3) Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 4) Seed Demo Users + Products
```bash
npm run seed
```

It creates:
- Admin: `admin@casadenza.local` / `ChangeMe123!`
- Distributor: `distributor1@casadenza.local` / `ChangeMe123!`

## 5) Run
```bash
npm run dev
```

Open: http://localhost:3000

## 6) Zoho CRM Integration (Later)
This project includes a stub at `lib/zoho.ts`.
For Zoho CRM only, it's recommended to create a **custom module** like:
- `Distributor_Orders`
- `Distributor_Order_Items` (optional)
Then we will map fields + sync orders/status/documents.

