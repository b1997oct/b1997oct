# MongoDB & User Management

This document outlines how chat history and temporary user sessions are managed using MongoDB in the **Agent_B7** project.

## 1. Overview
The system uses **MongoDB** to store chat conversations for "temporary" users. Users are identified by a unique `sessionId` stored in their browser's `localStorage`.

## 2. Session Management
- **Identification**: On the first visit, the client generates a UUID and stores it as `chat_session_id` in `localStorage`.
- **Persistence**: This ID is sent with every chat request (`POST /api/chat`).
- **Resetting**: Users can reset their session. This generates a *new* UUID, clearing the local chat history but leaving the previous history in the database.

## 3. Database Schema
Conversations are stored in the `chats` collection with the following structure:

```json
{
  "_id": "ObjectId",
  "sessionId": "uuid-string",
  "messages": [
    { "role": "user", "content": "user message text" },
    { "role": "assistant", "content": "agent response text" }
  ],
  "expiresAt": "ISODate"
}
```

## 4. Temporary Data (TTL)
To manage storage and ensure data is "temporary," we use a **TTL (Time To Live)** index on the `expiresAt` field.
- **Index**: `db.chats.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })`
- **Behavior**: MongoDB automatically deletes documents when the current time reaches the `expiresAt` value.
- **Default TTL**: History is currently set to expire **24 hours** after the last message.

## 5. API Implementation
- **POST `/api/chat`**: 
    - Fetches existing history for the `sessionId`.
    - Passes history to the AI model for context.
    - Saves updated history with a new `expiresAt` timestamp.
- **GET `/api/chat?sessionId=...`**: 
    - Retrieves stored messages to restore chat history when the user refreshes the page.

## 6. Security & Configuration
- **Connection**: Managed via `src/lib/db.ts` using a singleton pattern.
- **Environment Variables**:
    - `MONGODB_URI`: The connection string (stored in `.env`).
    - Configured in `astro.config.mjs` under the `env.schema` for secure server-side access.
