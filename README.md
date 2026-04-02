# Furniture ERP

Full-stack accounting and business management system for a furniture retail and manufacturing workflow. The project is organized as a monorepo with a React + TypeScript frontend and an Express + Prisma + PostgreSQL backend.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, local shadcn-style UI primitives, React Query, Recharts
- Backend: Node.js, Express.js, Prisma ORM, Zod validation, JWT auth, RBAC
- Database: PostgreSQL
- Reporting: React-PDF/PDF-ready API payload scaffolding

## Folder Structure

```text
.
├── client
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   ├── pages
│   │   ├── styles
│   │   └── types
│   ├── index.html
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── server
│   ├── prisma
│   │   ├── migrations
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src
│   │   ├── config
│   │   ├── middleware
│   │   ├── routes
│   │   ├── schemas
│   │   ├── services
│   │   ├── types
│   │   └── utils
│   └── uploads
├── .env.example
├── package.json
└── README.md
```

## Implemented Scope

- Prisma schema for the core entities plus supporting models for stock movements, goods receipts, supplier invoices, bank reconciliation, and system settings
- Initial SQL migration scaffold at `server/prisma/migrations/20260320000000_init/migration.sql`
- Seed script with:
  - 5 furniture categories
  - 20 products with 2-3 variants each
  - 5 suppliers
  - 3 warehouses
  - 10 customers
  - sample purchase orders, sales orders, invoices, payments, deliveries, expenses, and journal entries
  - one seeded user for each RBAC role
- Express REST routes for auth, dashboard, products, inventory, suppliers, purchase orders, customers, sales orders, invoices, payments, accounting, deliveries, reports, settings, users, and global search
- React application shell and module pages for dashboard, inventory, purchasing, sales, invoicing, accounting, delivery, reporting, settings, product detail, and user management
- Live reporting library and custom report preview flow backed by `/reports/*` and `/reports/custom-builder`

## Environment

Copy the root example file:

```bash
cp .env.example .env
```

Required values are already documented in `.env.example`.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the database (using Docker Compose):
   ```bash
   docker compose up -d
   ```

3. Generate Prisma client:
   ```bash
   npm run generate --workspace server
   ```

4. Apply migrations:
   ```bash
   npm run migrate --workspace server
   ```

5. Seed the database:
   ```bash
   npm run seed
   ```

6. Start both apps:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:4000`.

## Workspace Scripts

```bash
npm run dev
npm run build
npm run lint
npm run seed
```

Server-only useful commands:

```bash
npm run generate --workspace server
npm run migrate --workspace server
npm run seed --workspace server
```

## Default Login Credentials

All seeded users use the same password:

```text
Password123!
```

Accounts:

- Admin: `admin@manishsteel.com.np`
- Accountant: `accountant@manishsteel.com.np`
- Sales: `sales@manishsteel.com.np`
- Warehouse: `warehouse@manishsteel.com.np`
- Driver: `driver@manishsteel.com.np`

## API Notes

Base URL:

```text
http://localhost:4000/api
```

Representative endpoints:

- `POST /auth/login`
- `GET /dashboard/summary`
- `GET /products`
- `POST /purchase-orders/:id/receive`
- `POST /invoices/from-sales-order/:id`
- `POST /payments`
- `GET /accounting/reports/profit-loss`
- `GET /reports/financial-summary`
- `POST /reports/custom-builder`
- `GET /search/global?q=...`

## Next Recommended Steps

- Install dependencies and run the Prisma client generation step
- Add downloadable PDF/CSV generation on top of the live reporting endpoints
- Expand the custom report builder with saved presets, richer field discovery, and true grouped aggregations
- Add email delivery and file uploads for production workflows
- Add tests for route validation, accounting postings, and report calculations
