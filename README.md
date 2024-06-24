# Email Core API

Real-time Outlook Email Syncing

This API provides real-time Outlook email synchronization using OAuth, Elasticsearch, Microsoft change notifications (webhooks).

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js: Version 18 or higher
- Docker: Both Docker and Docker Compose

### Installation

1. Clone the repository:

   git clone https://github.com/swikars1/email-core-backend.git

2. Install dependencies:

   `cd email-core-backend`

   `npm install`

3. Create .env:

   Create a .env file at the root of your project and fill in your environment variables.

4. Run with Docker:

   `docker compose up setup`

   `docker compose up --build`

5. Get ngrok HTTPS URL:

   `npm run ngrok-url`

6. Update .env:

   Replace the value of `WEBHOOK_BASE_URL` in your .env file with the ngrok HTTPS URL. Example:

   `WEBHOOK_BASE_URL=https://d7f8-80b9-a79-c0-1434.ngrok-free.app`

7. Restart Express Server:

   `docker compose restart express-server`
