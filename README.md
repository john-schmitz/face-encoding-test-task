# Face Encoding Service

A microservice that enables users to create face encoding sessions, upload images, and retrieve encoding data.

## Docker
The application can be ran using Docker Compose:

```
docker-compose up
```

This will start:
- The face encoding service on port 3000
- The external face encoding processor on port 8000

## API Documentation

API documentation is available at `http://localhost:3000/documentation` when the service is running.

***PLEASE MAKE SURE TO SELECT THE RIGHT SERVER***

### Key Endpoints

- `GET /v1/api/sessions` - List user sessions
- `POST /v1/api/sessions` - Create a new session with image uploads
- `GET /v1/api/sessions/:id` - Get session details by ID

All endpoints require a `userid` header for authentication.

## Overview

This service provides a REST API for managing face encoding sessions. It processes user-uploaded images (up to 5 per session), extracts facial encodings via an external service, and stores session data for later retrieval.

Since we can assume that that customers are already authenticated and authorized to
interact with Veriff’s services. User identification will be achieved by passing a `userid` header to each request.

## Technical Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web Framework**: Fastify
- **Database**: SQLite with Drizzle ORM
- **Testing**: Jest
- **API Documentation**: OpenAPI/Swagger

## Development

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

1. Clone the repository
2. Create a `.env` file:
   ```
   PORT=5413
   DATABASE_URL=file:data/local.sqlite
   FACE_ENCODING_ENDPOINT=http://localhost:8000/v1/selfie
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run database migrations:
   ```
   npm run db:migrate
   ```

### Running Locally

```
npm run watch
```

### Testing

```
npm test
```
