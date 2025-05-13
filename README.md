# E-commerce Backend API

A complete e-commerce backend API built with TypeScript, Node.js, Express.js, Prisma ORM, and MongoDB.

## Features

- User authentication (register, login, profile management)
- Product management with categories and variants
- Shopping cart functionality
- Order processing with status tracking
- Review and rating system
- Admin dashboard with analytics
- Role-based access control

## Tech Stack

- **Language**: TypeScript
- **Server Framework**: Express.js
- **ORM**: Prisma
- **Database**: MongoDB
- **Authentication**: JWT
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file based on `.env.example` with your configuration:

```
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/ecommerce?retryWrites=true&w=majority"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="30d"
PORT=5000
NODE_ENV="development"
LOG_LEVEL="debug"
```

4. Run Prisma generate to create the client

```bash
npx prisma generate
```

5. Start the development server

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### User

- `GET /api/users/me` - Get user profile
- `PATCH /api/users/me` - Update user profile
- `GET /api/users/addresses` - Get user addresses
- `POST /api/users/addresses` - Add new address
- `PATCH /api/users/addresses/:id` - Update address
- `DELETE /api/users/addresses/:id` - Delete address
- `GET /api/users/orders` - Get user orders

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product (Admin)
- `PATCH /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create new category (Admin)
- `PATCH /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Cart

- `GET /api/cart` - Get cart
- `POST /api/cart` - Add to cart
- `PATCH /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove from cart
- `DELETE /api/cart` - Clear cart

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all user orders
- `GET /api/orders/:id` - Get single order
- `PATCH /api/orders/:id/cancel` - Cancel order

### Reviews

- `GET /api/reviews/products/:productId` - Get product reviews
- `POST /api/reviews/products/:productId` - Add review
- `PATCH /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Admin

- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order by ID
- `PATCH /api/admin/orders/:id/status` - Update order status
