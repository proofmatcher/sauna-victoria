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
- **Trip Management:** Create, update, delete trips
- **Booking Management:** View all bookings, manual confirm/cancel
- **User Management:** View users, deactivate/reactivate accounts, role updates
- **Dashboard:** Real-time statistics (total revenue, bookings, utilization)

### 📝 Content Management
- **Service Post System:** Blog/news/services content management
- Create, update, delete posts with rich content
- Featured posts system for homepage
- Category-based organization
- Draft/Published workflow
- View tracking and statistics
- Auto-generated SEO-friendly slugs
- **Public API** for frontend consumption

## 📚 Documentation

- **[Service Post API Documentation](./SERVICE_POST_API.md)** - Complete API reference
- **[Quick Start Guide](./SERVICE_POST_QUICKSTART.md)** - Quick reference and examples

## 🏗️ Tech Stack

- **Backend:** Express.js + TypeScript
- **Database:** MongoDB
- **Payment:** Stripe SDK
- **Authentication:** JWT
- **Email:** Nodemailer
- **Deployment:** Docker + Docker Compose

## 🔗 API Endpoints Overview

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
- `POST /api/trips/createTrip` - Create trip
- `GET /api/admin/bookings/getAll` - View all bookings
- `GET /api/admin/users` - Manage users
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `POST /api/admin/posts` - Create service post
- Full CRUD for trips, vessels, bookings, users, and posts

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Stripe Account (for payments)

### Installation

1. Clone the repository
2. Set up environment variables (see `.env.example`)
3. Run with Docker:
```bash
docker-compose up --build -d
```

### Environment Variables
```env
PORT=4000
MONGO_URI=mongodb://admin:root@mongo:27017/sauna?authSource=admin
JWT_SECRET=your_secret_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
HOLD_MINUTES=30
```

## 📊 Current Status

✅ **Fully Implemented:**
- Authentication & JWT
- User management with deactivation
- Trip & vessel CRUD
- Booking system with holds
- Stripe payment integration
- Admin dashboard with statistics
- Service post management system
- Public content API

⚠️ **In Progress:**
- File upload for post images
- Advanced analytics
- Email notifications for bookings

## 🧪 Testing

Use the provided CURL examples in documentation or import into Postman.

### Test Admin Account
- Email: `admin@example.com`
- (Set password during first run)

## 📦 Project Structure

```
express-ts-app/
├── src/
│   ├── config/         # Database & Stripe config
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth & RBAC middleware
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── cron/           # Scheduled tasks
├── SERVICE_POST_API.md
└── SERVICE_POST_QUICKSTART.md
```

## 🤝 Contributing

This is a private project. Contact the owner for contribution guidelines.

## 📄 License

Private - All rights reserved