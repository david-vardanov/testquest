# Test Quiz App

A gamified testing platform that motivates employees to complete test cases while maintaining structured documentation.

## Features

- **Test Flows** - Organize test cases into flows with completion bonuses
- **Point System** - Earn points for completing tests, finding bugs, providing feedback
- **Leaderboard** - Position-based rewards for top performers
- **Admin Dashboard** - Manage users, test cases, flows, and review submissions
- **Flow Analytics** - Visual tree diagrams showing user progression and drop-off points
- **CSV Export** - Export submissions data with filters
- **Budget Tracking** - Monitor reward spending

## User Roles

### Superadmin
- Create and manage test cases and flows
- Review and approve submissions
- Award/reject individual point components
- Manage rewards and leaderboard settings
- View flow analytics with tree visualizations
- Export submissions to CSV
- Reset user progress

### Tester
- View available test flows
- Submit test results with feedback and screenshots
- Track personal points and rank
- View leaderboard

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

### Default Credentials

After seeding, login with:
- **Username**: Value of `ADMIN_USERNAME` env var (default: `admin`)
- **Password**: Value of `ADMIN_PASSWORD` env var

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
| Useful feedback (admin marked) | +1 |
| Complete flow | Bonus (configurable per flow) |

Admin can reject individual point components before approval.

## Admin Features

### Submission Review
- Filter by flow, status, user, approval state
- Toggle individual point components (feedback/screenshot/bug)
- Mark feedback as useful (+1 bonus)
- Approve to award points
- Rerun - allow user to retake test
- Reset - delete submission and deduct points

### Flow Analytics (`/admin/analytics`)
- Overall statistics (flows, test cases, users, submissions)
- Tree flow visualization per flow showing:
  - User progression through test cases
  - Drop-off indicators between steps
  - Pass/fail rates per test case
  - Completion percentages
- Detailed test case breakdown

### CSV Export
- Export filtered submissions from `/admin/submissions`
- Includes: date, user, flow, test case, status, points, feedback, etc.

### Reward Management
- Create position-based reward tiers (e.g., 1st place, 2nd-3rd place)
- Set prize amounts and descriptions
- Award rewards to top users
- Track claim status (pending → claimed → delivered)

## Data Models

- **User** - username, email, password, role, points
- **Flow** - name, description, test cases, completion bonus
- **TestCase** - title, description, scenario, expected result
- **Submission** - user, test case, flow, status, feedback, screenshot, points
- **FlowProgress** - tracks user's progress through flows
- **Reward** - position-based reward tiers
- **RewardClaim** - tracks reward distribution
- **LeaderboardSettings** - season configuration

## Routes

### Admin Routes (`/admin/*`)
- `/admin` - Dashboard
- `/admin/users` - User management
- `/admin/testcases` - Test case management
- `/admin/flows` - Flow management
- `/admin/submissions` - Submission review
- `/admin/submissions/export` - CSV export
- `/admin/analytics` - Flow analytics
- `/admin/rewards` - Reward management
- `/admin/rankings` - Leaderboard

### Tester Routes (`/tester/*`)
- `/tester` - Dashboard with available flows
- `/tester/flow/:id` - Take a test flow
- `/tester/submissions` - View own submissions
- `/tester/leaderboard` - View rankings

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- EJS templates + Bootstrap 5
- Docker
- Multer (file uploads)
- bcryptjs (password hashing)
- express-session + connect-mongo

## Project Structure

```
├── app.js              # Express app setup
├── seed.js             # Database seeder
├── models/             # Mongoose models
├── routes/
│   ├── admin.js        # Admin routes
│   ├── auth.js         # Authentication
│   └── tester.js       # Tester routes
├── views/
│   ├── admin/          # Admin templates
│   ├── auth/           # Login/register
│   ├── tester/         # Tester templates
│   └── layouts/        # Base layout
├── middleware/
│   └── auth.js         # Auth middleware
├── public/             # Static assets
└── uploads/            # Uploaded screenshots
```

## License

MIT
