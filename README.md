# Monolith App

A NestJS monolith application that consolidates multiple business services into a single application using NestJS modules.

## Description

This is a monolithic NestJS application that organizes different business domains as separate modules within a single codebase. The application includes:

- **Users Module**: User management and authentication
- **Products Module**: Product catalog and management
- **Orders Module**: Order processing and management
- **Loyalty Module**: Customer loyalty and rewards program

## Architecture

The application follows a modular monolith architecture where each business domain is encapsulated in its own NestJS module with:

- Controllers for handling HTTP requests
- Services for business logic
- Models/DTOs for data structures
- Potential for shared modules and cross-module communication

## Project setup

```bash
$ npm install
```

## Compile and run the project

### Local Development

```bash
# Install dependencies
$ npm install

# development mode (with auto-reload)
$ npm run start:dev

# Watch mode
$ npm run start:watch

# debug mode
$ npm run start:debug

# production mode (requires build first)
$ npm run build
$ npm run start:prod
```

### Docker & Docker Compose

The monolith is designed to run with Docker Compose, which orchestrates:

- **NestJS App** (Users, Products, Loyalty modules) on port 3000
- **Go Orders Service** on port 8080

**Prerequisites:** Docker Desktop must be running

```bash
# Build Docker images
$ npm run docker:build

# Start all services
$ npm run docker:up

# Start in background
$ npm run docker:up:d

# View logs
$ npm run docker:logs

# Stop all services
$ npm run docker:down

# Restart services
$ npm run docker:restart
```

## Run tests

```bash
# unit tests
$ npm run test

# watch mode
$ npm run test:watch

# test coverage
$ npm run test:cov
```

## Service Endpoints

Once running, the application exposes the following endpoints:

### NestJS App (Port 3000)

- **Users Module**
  - `POST /auth/sign-up` - Register a new user
  - `POST /auth/sign-in` - Login user
  - `GET /users/:id` - Get user by ID
  - `GET /health` - Health check

- **Products Module**
  - `GET /products` - List all products
  - `GET /products/:id` - Get product details
  - `POST /products` - Create product (admin only)

- **Loyalty Module**
  - `POST /loyalty/accrue` - Accrue loyalty points
  - `POST /loyalty/redeem` - Redeem points
  - `GET /loyalty/balance/:userId` - Get loyalty balance
  - `GET /loyalty/redemptions/:userId` - Get redemption history

### Go Orders Service (Port 8080)

- `GET /orders` - List orders
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `PUT /orders/:id` - Update order

## Environment Variables

The application uses the following environment variables:

```env
# NestJS App
NODE_ENV=development|production
PORT=3000

# Service URLs (used by NestJS app to communicate with Go Orders service)
ORDER_SERVICE_URL=http://orders:8080
USER_SERVICE_URL=http://localhost:3000
PRODUCT_SERVICE_URL=http://localhost:3000
```

When running with Docker Compose, `ORDER_SERVICE_URL` is automatically set to `http://orders:8080` (docker network hostname).

## Architecture Notes

### Monolith Design

- **Users, Products, Loyalty**: Implemented as NestJS modules within the same Node.js process
- **Orders**: Standalone Go service running in a separate container
- **Cross-Service Communication**: NestJS app calls Orders service via HTTP using the `OrderClient`
- **Internal Communication**: Users, Products, and Loyalty modules use NestJS dependency injection

### Technology Stack

- **NestJS**: Framework for the monolithic core
- **TypeScript**: Language for NestJS modules
- **Go**: Alternative language for Orders microservice
- **Docker Compose**: Orchestration for multi-service deployment
- **Jest**: Testing framework
- **bcrypt**: Password hashing for authentication

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
