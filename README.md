# Test Quiz App

A gamified testing platform that motivates employees to complete test cases while maintaining structured documentation.

## Features

- **Test Flows** - Organize test cases into flows with completion bonuses
- **Point System** - Earn points for completing tests, finding bugs, providing feedback
- **Leaderboard** - Position-based rewards for top performers
- **Admin Dashboard** - Manage users, test cases, flows, and review submissions
- **Budget Tracking** - Monitor reward spending

## Quick Start

### Development

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start MongoDB:
   ```bash
   docker-compose up -d
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Seed the database:
   ```bash
   node seed.js
   ```
6. Start the app:
   ```bash
   npm run dev
   ```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Session encryption key | Yes |
| `ADMIN_USERNAME` | Superadmin username | No (default: admin) |
| `ADMIN_EMAIL` | Superadmin email | No |
| `ADMIN_PASSWORD` | Superadmin password | Yes (for seeding) |

## Point System

| Action | Points |
|--------|--------|
| Complete test | 1 |
| Provide feedback | +1 |
| Attach screenshot | +1 |
| Find bug (failed test) | +3 |
| Complete flow | Bonus (configurable) |

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- EJS templates + Bootstrap 5
- Docker

## License

MIT
