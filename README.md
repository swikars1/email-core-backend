# Email Core API

Real-time Outlook Email Syncing

This API provides real-time Outlook email synchronization using OAuth, Elasticsearch, Sockets and Microsoft change notifications with resources.

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

5. Install ngrok from here: https://ngrok.com/docs/getting-started/

   `ngrok http 3000 --host-header=rewrite`

6. Update .env:

   Replace the value of `WEBHOOK_BASE_URL` in your .env file with the ngrok HTTPS URL. Example:

   `WEBHOOK_BASE_URL=https://d7f8-80b9-a79-c0-1434.ngrok-free.app`

7. Restart Express Server:

   `docker compose restart express-server`

**Note for local development evironment:**

Subscription object consist of `WEBHOOK_BASE_URL`, if webhook url is changed later or if ngrok is restarted need to the following steps:

- Remove all old values of that user from elasticsearch `subscriptions` index.
- Refresh the page to create new subscriptions in the microsoft server and in local.
