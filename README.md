# Raub Hang Seng Ecommerce

Production storefront and seller dashboard for Raub Hang Seng Fisheries.

## Local Development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run dev
```

The development server provides the React storefront and backend API together. Local persistent data is stored under `server/data/` and is excluded from Git.

## Validation

Run these before committing or deploying:

```bash
npm run lint
npm run test:production
npm run build:all
```

`build:all` also enforces the storefront entry-size budget and verifies that seller and route-specific interfaces remain on-demand chunks.

## Production Deployment

The supported production target is the single-container EC2 deployment documented in [DEPLOY_EC2.md](DEPLOY_EC2.md). It uses:

- Docker with a persistent named volume for catalog, orders, users, uploads, and payment slips.
- Nginx and HTTPS in front of the app.
- Backend-calculated prices, discounts, shipping, and order totals.
- Verified pre-deploy backups, candidate health checks, retained previous releases, and health-checked rollback.
- Release identity verification that proves the running container matches the deployed Git commit.
- An external verifier for HTTPS headers, public-data privacy, seller authentication boundaries, and domain redirects.

Brand-new stores use owner ID `admin` and initial password `abcd1234`. Sign in at `/seller`, open **Store Settings**, and change the initial password immediately.

Do not run more than one app container against the JSON data volume. Horizontal scaling requires moving the persistent store to a transactional database and shared object storage first.
