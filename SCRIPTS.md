# Scripts & Commands Reference

## Development

```bash
# Start all services with live reload
npm run dev

# Build for development
npm run build

# Type checking
npm run lint
```

## Production

```bash
# Build optimized bundles
npm run build

# Start production server
NODE_ENV=production npm run start --workspace server

# Preview production build
npm run preview --workspace client
```

## Database

```bash
# Create a new migration
npm run migrate --workspace server

# Seed initial data
npm run seed --workspace server

# Generate Prisma client
npm run generate --workspace server
```

## Docker

```bash
# Build all Docker images
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Run database migrations
npm run docker:migrate

# Seed database
npm run docker:seed
```

## Individual Workspaces

```bash
# Server commands
npm run dev --workspace server          # Dev server
npm run build --workspace server        # Build
npm run start --workspace server        # Start production
npm run lint --workspace server         # Type check
npm run migrate --workspace server      # Database migrations
npm run seed --workspace server         # Seed data

# Client commands
npm run dev --workspace client          # Dev server
npm run build --workspace client        # Build
npm run preview --workspace client      # Preview production
npm run lint --workspace client         # Type check
```

## Troubleshooting

```bash
# Kill process on port
lsof -i :<port> | grep LISTEN | awk '{print $2}' | xargs kill -9

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Reset database (destructive!)
npm run seed --workspace server

# Check TypeScript errors
npm run lint

# Clean build
rm -rf dist && npm run build
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - run: npm run docker:build
      # Add Docker push and deployment steps here
```
