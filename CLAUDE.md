# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start in watch mode (NODE_ENV=development)
npm run build         # Compile TypeScript
npm run lint          # Fix ESLint issues

# Testing
npm test                                          # Run all Jest tests
npx jest src/path/to/file.spec.ts                 # Run single test file
npx jest --testNamePattern="test name"            # Run tests matching a name

# Migrations
npm run mg:gen        # Generate migration from entity changes
npm run mg:run        # Run pending migrations
npm run migration:revert  # Revert last migration

# Infrastructure (starts both PostgreSQL 15 and Redis)
docker-compose up -d
```

## Architecture

**Entry points:**
- `src/main.ts` — Bootstrap: Express + Socket.IO with Redis adapter, CORS for `localhost:5173`, Swagger at `/api/docs`, port 8000
- `src/app.module.ts` — Root module: wires all feature modules, registers global `JwtAuthGuard` + `RolesGuard`, Bull/Redis setup
- `src/data-source.ts` — TypeORM config used by the CLI (migrations); reads `.env.${NODE_ENV}`

**Feature modules:** `auth`, `users`, `admin`, `organizers`, `collaborators`, `events`, `event-session`, `ticket-type`, `ticket`, `order`, `bookings`, `seat-map`

## Auth & Authorization

Global guards on every route — use decorators to configure access:
- `@Public()` — bypass `JwtAuthGuard` (no token required)
- `@Roles('admin', 'organizer', ...)` — restrict to specific roles via `RolesGuard`
- `@User()` — param decorator to extract the authenticated user from `request.user`

JWT tokens are stored in **cookies** (`withCredentials: true`). Access token: 1h, refresh token: 30d.

Roles: `admin`, `organizer`, `user`, `collaborator`

## Event Status Lifecycle

```
draft → pending_review → needs_revision ↔ pending_review
                       → rejected
                       → upcoming → ongoing → ended
                                 → cancelled  (triggers batch-refund queue)
```

## File Upload Pattern

Endpoints accepting multipart form data use `FileFieldsInterceptor` + `ParseEventDataPipe` (`src/core/pipes/parse-event-data.pipe.ts`). The DTO is sent as a JSON string in `@Body('data')` and validated by the pipe. See event creation for the reference implementation.

## Queue Processing

Two Bull queues backed by Redis:

**`batch-refund`** (`src/events/processors/batch-refund.processor.ts`)
- Triggered when an event is cancelled
- Processes orders in chunks of 100; sends refund emails in batches of 20 with 3s delay between batches (avoids Gmail throttle)
- Final chunk marks the event as `cancelled`

**`booking-queue`** (`src/bookings/booking.processor.ts`)
- Releases reserved ticket inventory if payment is not completed within the window
- Uses Redis key `booking:processing:{userId}:{ticketTypeId}` as a distributed lock; re-enqueues with exponential backoff if user is still in payment flow

## Real-Time (WebSocket)

`src/bookings/payment-events.gateway.ts` — namespace `/payment-events`
- Authenticates via JWT in cookie or query param
- Max 3 concurrent connections per user; oldest is auto-disconnected on limit

## Key Integrations

- **Database:** PostgreSQL 15 via TypeORM (user=`dat`, pass=`dat`, db=`bookingService`)
- **Cache/Queue:** Redis, key prefix `highshow:`
- **Payments:** PayOS and SePay gateways
- **Email:** Nodemailer + Handlebars templates in `src/mail/templates/` (`.hbs` files)
- **Storage:** Cloudinary
- **Real-time:** Socket.IO with Redis adapter

## Environment

`.env.development` / `.env.production` — loaded by `ConfigModule` based on `NODE_ENV`.
API docs: `http://localhost:8000/api/docs`

## Coding Rules

- **Exceptions:** All exception messages must be written in **Vietnamese**.
- **Database Queries:** Select only necessary fields when using `LEFT JOIN`.
- **Background Processes:** Any job dealing with large datasets must process data in **chunks**.
- **Entities:** UUIDs for all primary keys; soft deletes on `EventEntity` via `@DeleteDateColumn()`.
- **Rate limiting:** 10 req/60s globally (ThrottlerModule); override per-route with `@Throttle()`.
