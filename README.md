# Sauna Boat Booking System

## 🚀 Features

At this point, the backend fully supports:

### 🔐 Authentication & User Management
- User registration & login with JWT tokens
- Password reset via email
- Admin & user role-based access control (RBAC)
- User deactivation/reactivation system

### 🛥️ Booking & Payments
- Trip and vessel management
- Real-time seat availability tracking
- 30-minute booking hold system
- **Stripe payment integration** with webhook confirmation
- Automatic booking confirmation on successful payment
- Payment status tracking

### 👨‍💼 Admin Management
- **Trip Management:** Create, update, delete trips with staff assignment
- **Staff Management:** Assign staff to trips, automatic email notifications
- **Booking Management:** View all bookings, manual confirm/cancel
- **User Management:** View users, deactivate/reactivate accounts, role updates, staff roster
- **Dashboard:** Real-time statistics (total revenue, bookings, utilization)

### 📝 Content Management
- **Service Post System:** Blog/news/services content management
- Create, update, delete posts with rich content
- Featured posts system for homepage
- Draft/Published workflow
- View tracking and statistics
- Auto-generated SEO-friendly slugs
- **Public API** for frontend consumption

### 📧 Email Notifications (Automated)
- **Staff Notifications:** Automatic emails when assigned to trips
- **Customer Confirmations:** Automatic emails on successful payment

## 🏗️ Tech Stack

- **Backend:** Express.js 5 + TypeScript 5.9
- **Database:** MongoDB 8 (via Mongoose 8.19)
- **Payment:** Stripe SDK 19.1
- **Authentication:** JWT (jsonwebtoken 9.0)
- **Email:** Nodemailer 7.0
- **Deployment:** Docker + Docker Compose
- **Scheduling:** Node-Cron 4.2
- **Date Handling:** Day.js 1.11

## 📦 Dependencies

### Install All Dependencies
```bash
# Install all production and development dependencies at once
npm install

# Or install manually:
```

### Core Dependencies (Production)

```bash
# Web Framework
npm install express@^5.1.0

# Database
npm install mongoose@^8.19.1

# Payment Processing
npm install stripe@^19.1.0

# Authentication
npm install jsonwebtoken@^9.0.2
npm install bcryptjs@^3.0.2

# Email
npm install nodemailer@^7.0.9

# Utilities
npm install cors@^2.8.5
npm install dotenv@^17.2.3
npm install node-cron@^4.2.1
npm install dayjs@^1.11.18
npm install joi@^18.0.1
npm install crypto@^1.0.1
```

| Package | Version | Purpose |
|---------|---------|---------|
| **express** | ^5.1.0 | Web framework for building REST APIs |
| **mongoose** | ^8.19.1 | MongoDB ODM for data modeling and validation |
| **stripe** | ^19.1.0 | Payment processing and webhook handling |
| **jsonwebtoken** | ^9.0.2 | JWT-based authentication and authorization |
| **bcryptjs** | ^3.0.2 | Password hashing and comparison |
| **nodemailer** | ^7.0.9 | Email sending (password reset, notifications) |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| **dotenv** | ^17.2.3 | Environment variable management |
| **node-cron** | ^4.2.1 | Scheduled tasks (booking cleanup) |
| **dayjs** | ^1.11.18 | Date/time manipulation and formatting |
| **joi** | ^18.0.1 | Request validation schemas |
| **crypto** | ^1.0.1 | Cryptographic operations (password reset tokens) |

### Development Dependencies

```bash
# TypeScript
npm install --save-dev typescript@^5.9.3
npm install --save-dev ts-node@^10.9.2
npm install --save-dev ts-node-dev@^2.0.0

# Type Definitions
npm install --save-dev @types/express@^5.0.3
npm install --save-dev @types/bcryptjs@^2.4.6
npm install --save-dev @types/jsonwebtoken@^9.0.10
npm install --save-dev @types/node@^24.7.0
npm install --save-dev @types/cors@^2.8.19
npm install --save-dev @types/nodemailer@^7.0.2
npm install --save-dev @types/node-cron@^3.0.11
npm install --save-dev @types/stripe@^8.0.416
npm install --save-dev @types/joi@^17.2.2

# Development Tools
npm install --save-dev nodemon@^3.1.10
```

| Package | Version | Purpose |
|---------|---------|---------|
| **typescript** | ^5.9.3 | TypeScript compiler and type system |
| **ts-node** | ^10.9.2 | TypeScript execution for Node.js |
| **ts-node-dev** | ^2.0.0 | Development server with auto-reload |
| **@types/express** | ^5.0.3 | TypeScript definitions for Express |
| **@types/bcryptjs** | ^2.4.6 | TypeScript definitions for bcryptjs |
| **@types/jsonwebtoken** | ^9.0.10 | TypeScript definitions for JWT |
| **@types/node** | ^24.7.0 | TypeScript definitions for Node.js |
| **@types/cors** | ^2.8.19 | TypeScript definitions for CORS |
| **@types/nodemailer** | ^7.0.2 | TypeScript definitions for Nodemailer |
| **@types/node-cron** | ^3.0.11 | TypeScript definitions for node-cron |
| **@types/stripe** | ^8.0.416 | TypeScript definitions for Stripe |
| **@types/joi** | ^17.2.2 | TypeScript definitions for Joi |
| **nodemon** | ^3.1.10 | Development file watcher and auto-restart |

### Quick Install by Category

```bash
# Authentication & Security
npm install bcryptjs jsonwebtoken cors dotenv

# Database
npm install mongoose

# Payment
npm install stripe

# Email & Scheduling
npm install nodemailer node-cron

# Utilities
npm install dayjs joi crypto

# All TypeScript (Dev)
npm install --save-dev typescript ts-node ts-node-dev nodemon

# All Type Definitions (Dev)
npm install --save-dev @types/express @types/bcryptjs @types/jsonwebtoken @types/node @types/cors @types/nodemailer @types/node-cron @types/stripe @types/joi
```

## � NPM Scripts

Available commands in `package.json`:

```bash
# Development
npm run dev          # Start development server with auto-reload (ts-node-dev)

# Building
npm run build        # Compile TypeScript to JavaScript (dist/ folder)
npm run clean        # Remove dist/ folder

# Production
npm start            # Run compiled JavaScript (node dist/server.js)

# Type Checking
npm run type-check   # Check TypeScript types without building
```

### Usage Examples

```bash
# Start development server
npm run dev
# Server running on http://localhost:4000 with hot reload

# Build for production
npm run build
# Compiled files in dist/ folder

# Run production build locally
npm start
# Running from dist/server.js

# Check for TypeScript errors
npm run type-check
# No files are emitted, just type checking
```

## �🔗 API Endpoints Overview

### Public Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/public/*` - Public trip/vessel listings
- `GET /api/services/*` - Public service posts

### User Endpoints (Auth Required)
- `POST /api/bookings/createBooking` - Create booking
- `POST /api/bookings/initiate-payment` - Start payment
- `GET /api/bookings/me` - User's bookings

### Admin Endpoints (Admin Role Required)
- `POST /api/trips/createTrip` - Create trip (auto-sends staff emails)
- `POST /api/trips/:id/notify-staff` - Manual staff notification
- `GET /api/admin/bookings/getAll` - View all bookings
- `GET /api/admin/users` - Manage users (list, filter, search)
- `GET /api/admin/users/staff/list` - Get all staff members
- `PUT /api/admin/users/:id/role` - Update role (auto-sets isStaff)
- `PUT /api/admin/users/:id/deactivate` - Deactivate user
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `POST /api/admin/posts` - Create service post
- Full CRUD for trips, vessels, bookings, users, and posts

**Total Endpoints:** 40+ (Public: 8, User: 10, Admin: 22+)

## 📁 Project Structure

```
express-ts-app/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── db.ts                 # MongoDB connection
│   │   └── stripe.ts             # Stripe SDK initialization
│   ├── models/
│   │   ├── User.ts               # User model (auth, roles, staff)
│   │   ├── Booking.ts            # Booking model (payments, status)
│   │   ├── Trip.ts               # Trip model (staff assignment)
│   │   ├── Vessel.ts             # Vessel model (capacity, type)
│   │   └── ServicePost.ts        # Blog/services content model
│   ├── controllers/
│   │   ├── authController.ts             # Registration, login, password reset
│   │   ├── bookingController.ts          # User booking operations
│   │   ├── tripController.ts             # Trip CRUD, staff notifications
│   │   ├── vesselController.ts           # Vessel CRUD
│   │   ├── publicController.ts           # Public trip listings
│   │   ├── adminBookingController.ts     # Admin booking management
│   │   ├── adminUserController.ts        # User management, staff roster
│   │   ├── adminDashboardController.ts   # Statistics and analytics
│   │   ├── adminServicePostController.ts # Service post CRUD
│   │   ├── publicServicePostController.ts # Public content API
│   │   └── stripeWebhookController.ts    # Stripe webhook handling
│   ├── routes/
│   │   ├── authRoutes.ts                # Auth endpoints
│   │   ├── bookingRoutes.ts             # User booking routes
│   │   ├── tripRoutes.ts                # Admin trip routes
│   │   ├── vesselRoutes.ts              # Admin vessel routes
│   │   ├── publicRoutes.ts              # Public endpoints
│   │   ├── stripeRoutes.ts              # Webhook routes
│   │   ├── adminBookingRoutes.ts        # Admin booking routes
│   │   ├── adminUserRoutes.ts           # User management routes
│   │   ├── adminDashboardRoutes.ts      # Dashboard routes
│   │   ├── adminServicePostRoutes.ts    # Admin content routes
│   │   └── publicServicePostRoutes.ts   # Public content routes
│   ├── middleware/
│   │   ├── authMiddleware.ts     # JWT verification
│   │   └── roleMiddleware.ts     # RBAC (user, staff, admin)
│   ├── services/
│   │   ├── bookingService.ts           # Booking business logic
│   │   ├── stripePaymentService.ts     # Payment processing
│   │   └── notificationService.ts      # Email notifications
│   ├── cron/
│   │   └── cleanupExpiredBookings.ts   # Scheduled cleanup job
│   └── utils/
│       ├── generateToken.ts      # JWT token generation
│       └── sendEmail.ts          # Email utility (Nodemailer)
├── dist/                         # Compiled JavaScript (production)
├── node_modules/                 # Dependencies
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── docker-compose.yml            # Docker services configuration
├── Dockerfile                    # Container build instructions
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── *.md                          # Documentation files
```

## 🏗️ Tech Stack

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Stripe Account (for payments)

### Installation

#### Option 1: Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd express-ts-app
```

2. **Create `.env` file**
```bash
cp .env.example .env
# Edit .env with your actual credentials (see Environment Variables section below)
```

3. **Build and start with Docker**
```bash
# Build and start all services (backend, MongoDB, mongo-express)
docker-compose up --build -d

# Check logs
docker logs express-ts-app-backend-1 --tail 50

# Verify all containers are running
docker ps
```

4. **Test the API**
```bash
curl http://localhost:4000/
# Should return: {"message": "Sauna Boat Booking API"}
```

#### Option 2: Local Development (Without Docker)

1. **Clone the repository**
```bash
git clone <repository-url>
cd express-ts-app
```

2. **Install Node.js dependencies**
```bash
# Install all dependencies at once
npm install

# Or install step by step (see Dependencies section for individual commands)
```

3. **Set up MongoDB**
```bash
# Option A: Use Docker for MongoDB only
docker run -d \
  --name sauna-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=root \
  mongo:latest

# Option B: Install MongoDB locally
# Download from https://www.mongodb.com/try/download/community
```

4. **Create `.env` file**
```bash
# Copy example and edit
cp .env.example .env

# Update MONGO_URI for local MongoDB:
# MONGO_URI=mongodb://admin:root@localhost:27017/sauna?authSource=admin
```

5. **Build TypeScript**
```bash
npm run build
```

6. **Start the server**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

7. **Test the API**
```bash
curl http://localhost:4000/
# Should return: {"message": "Sauna Boat Booking API"}
```

### Environment Variables
```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database
MONGO_URI=mongodb://admin:root@mongo:27017/sauna?authSource=admin

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_EXPIRE=30d

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Frontend
FRONTEND_URL=http://localhost:3000

# Booking Configuration
HOLD_MINUTES=30
```

### Email Setup (Gmail)
1. Enable 2-Factor Authentication on your Google Account
2. Go to **Security** → **2-Step Verification** → **App passwords**
3. Generate new app password for "Mail"
4. Use that password as `EMAIL_PASS` in `.env`
5. Test with password reset or staff notification

### Stripe Setup
1. Create account at [stripe.com](https://stripe.com)
2. Get test API keys from Dashboard
3. Set up webhook endpoint: `http://your-domain/api/stripe/webhook`
4. Subscribe to event: `checkout.session.completed`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## 🔧 Environment Configuration

## 📊 Current Status

✅ **Fully Implemented (100%):**
- ✅ Authentication & JWT with password reset
- ✅ User management (CRUD, deactivation, role management)
- ✅ Staff management (role-based)
- ✅ Trip & vessel CRUD with staff assignment
- ✅ Booking system with 30-minute holds
- ✅ Stripe payment integration with webhooks
- ✅ Email notifications (staff, customers, password reset)
- ✅ Admin dashboard with real-time statistics
- ✅ Service post management (8 admin endpoints)
- ✅ Public content API (6 public endpoints)
- ✅ Automated workflows (emails, flags, cleanup)
- ✅ Cron jobs (booking cleanup every minute)
- ✅ Role-based access control (user, staff, admin)
- ✅ Docker containerization with MongoDB
  
**Last Updated:** October 18, 2025 

## 🗄️ Database Models

### User Model
- **Fields:** name, email, password (hashed), role (user/staff/admin), isStaff, phone, isActive, resetPasswordToken
- **Features:** Password hashing, token generation, soft delete
- **Relations:** One-to-many with Bookings, many-to-many with Trips (as staff)

### Booking Model
- **Fields:** user, trip, vessel, numberOfSeats, totalPriceCents, status, paymentIntentId, expiresAt
- **Status:** pending, confirmed, cancelled, expired
- **Features:** Auto-expire after 30 minutes, Stripe integration
- **Relations:** Belongs to User, Trip, Vessel

### Trip Model
- **Fields:** vessel, title, departureTime, durationMinutes, capacity, remainingSeats, assignedStaff, staffNotified, groupBooked
- **Features:** Staff assignment, auto-email notifications, seat tracking
- **Relations:** Belongs to Vessel, many-to-many with Users (staff), one-to-many with Bookings

### Vessel Model
- **Fields:** name, type, capacity, description
- **Features:** Capacity management, availability tracking
- **Relations:** One-to-many with Trips and Bookings

### ServicePost Model
- **Fields:** title, slug, content, excerpt, author, category, tags, featuredImage, published, featured, views
- **Categories:** Services, News, Events, Blog, Guides, Updates
- **Features:** Auto-slug generation, view tracking, draft/publish workflow
- **Relations:** Belongs to User (author)

## 🧪 Testing

### Quick Test
```bash
# 1. Login as admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# 2. Save the token
export TOKEN="your_token_here"

# 3. Test any endpoint
curl -X GET "http://localhost:4000/api/admin/users" \
  -H "Authorization: Bearer $TOKEN"
```

## 🐛 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker logs express-ts-app-backend-1

# Rebuild
docker-compose down
docker-compose up --build -d
```

**MongoDB connection failed:**
```bash
# Verify MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs express-ts-app-mongo-1

# Verify credentials in .env match docker-compose.yml
```

**Emails not sending:**
```bash
# Verify EMAIL_USER and EMAIL_PASS in .env
cat .env | grep EMAIL

# Check for email errors in logs
docker logs express-ts-app-backend-1 | grep -i "email\|smtp"

# Test Gmail app password is correct
```

**Stripe webhook not working:**
```bash
# Verify webhook secret matches Stripe dashboard
echo $STRIPE_WEBHOOK_SECRET

# Check webhook logs
docker logs express-ts-app-backend-1 | grep -i "stripe\|webhook"

# Test with Stripe CLI
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

**TypeScript errors:**
```bash
# Type check without emitting files
npm run type-check

# Clean and rebuild
npm run clean
npm run build
```


## 📄 License

Private - All rights reserved