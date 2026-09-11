# KaamKaro.ai — Messaging / Chat Feature

A messaging and conversation feature for **KaamKaro.ai**, allowing users who are connected through a task/deal to communicate securely through the platform.

The implementation includes the frontend messaging interface, backend APIs, database integration, access control, message persistence, read/unread indicators, and QA validation.

---

## 📌 Project Overview

**Project:** KaamKaro.ai
**Feature:** User-to-user Messaging / Chat
**Repository:** KaamKaro.ai
**Application:** Next.js web application

The messaging system allows eligible users to:

* View their conversations
* Open a conversation related to a task
* Send text messages
* Receive messages
* View message timestamps
* View sent/read status
* Track unread messages
* See unread message counts
* Delete their own messages
* Preserve messages after page refresh
* Access conversations only when authorized

The implementation currently uses **near-real-time polling** rather than WebSockets.

---

# 👥 Team

| Team Member            | Role                              | Responsibilities                                                                     |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| **Noor Fatima**        | Frontend / UI Developer           | Messaging UI, conversation interface, responsive design                              |
| **Tayyaba Abbasi**     | Backend / Logic Developer         | Messaging APIs, database logic, authorization                                        |
| **Prabhavati S. Agre** | QA, Integration & Deployment Lead | Testing, security validation, integration, documentation and deployment verification |

---

# 🚀 Features

## Messaging

* User-to-user text messaging
* Send and receive messages
* Conversation-based messaging
* Task-related conversations
* Message timestamps
* Message persistence
* Conversation history
* Near-real-time message updates

## Read / Unread

* Sent/read indicators
* Unread message divider
* Unread message count
* Read status tracking
* Conversation-level unread indication

## Message Management

* Users can delete their own messages
* Users cannot delete another user's messages
* Deleted messages are handled through backend authorization

## Security

* Authentication required
* Authorization checks for conversations
* Only authorized task participants can access task conversations
* Task owner/provider access validation
* Admin access for applicable disputed tasks
* Unauthorized users are prevented from accessing protected conversations
* Database credentials are stored through environment variables

## Responsive UI

The messaging interface is designed to work on:

* Desktop
* Laptop
* Tablet
* Mobile devices

---

# 🛠️ Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* CSS / Tailwind CSS where applicable

### Backend

* Next.js API Routes
* TypeScript
* Server-side authorization logic

### Database

* PostgreSQL
* Neon PostgreSQL

### Development

* Node.js
* npm
* Git
* GitHub

### Deployment

* Vercel
* Neon PostgreSQL

---

# 📁 Important Project Structure

```text
Kaamkaro.ai/
│
├── app/
│   ├── api/
│   │   ├── conversations/
│   │   │   └── route.ts
│   │   │
│   │   └── tasks/
│   │       └── [id]/
│   │           └── messages/
│   │               └── route.ts
│   │
│   └── messages/
│       └── page.tsx
│
├── components/
│   └── MessagesInterface.tsx
│
├── public/
│
├── package.json
├── package-lock.json
├── README.md
├── .env.example
└── .gitignore
```

> File names may vary if the project structure is updated during future development.

---

# 💻 Prerequisites

Before running the project, install:

* Node.js
* npm
* Git
* PostgreSQL database / Neon PostgreSQL account

Recommended Node.js version:

```text
Node.js 20+
```

Check installed versions:

```bash
node -v
npm -v
git --version
```

---

# 📥 Installation

Clone the repository:

```bash
git clone <REPOSITORY_URL>
```

Move into the project directory:

```bash
cd Kaamkaro.ai
```

Install dependencies:

```bash
npm install
```

---

# 🔐 Environment Variables

Create a local environment file:

```text
.env.local
```

Add the required environment variables.

Example:

```env
DATABASE_URL="your-neon-postgresql-connection-string"
```

If the project contains additional authentication or application environment variables, add them according to the existing `.env.example`.

### Important

Never commit `.env.local` or other files containing secrets.

Verify:

```bash
git status
```

Make sure sensitive environment files are not included in the commit.

---

# 🗄️ Database Configuration

The project uses **PostgreSQL**, with **Neon PostgreSQL** used for the database environment.

The database connection is provided through:

```env
DATABASE_URL="..."
```

The application uses the database for persistent messaging and conversation information.

Typical messaging data includes:

* Conversation ID
* Task ID
* Sender
* Receiver / participants
* Message body
* Timestamp
* Read status

---

# ▶️ Running the Project Locally

After installing dependencies and configuring `.env.local`, start the development server:

```bash
npm run dev
```

Alternative package managers:

```bash
yarn dev
```

or:

```bash
pnpm dev
```

or:

```bash
bun dev
```

The application should normally be available at:

```text
http://localhost:3000
```

Open the messaging page:

```text
http://localhost:3000/messages
```

> Authentication may be required before accessing the messaging functionality.

---

# 🏗️ Production Build

Before deployment, create a production build:

```bash
npm run build
```

A successful build should complete without compilation or TypeScript errors.

To start the production application locally:

```bash
npm start
```

---

# 💬 Messaging API

The messaging functionality is implemented through Next.js API routes.

## Conversations API

```text
GET /api/conversations
```

Used to retrieve the authenticated user's conversations.

---

## Task Messages API

```text
GET /api/tasks/[id]/messages
```

Used to retrieve messages associated with a specific task.

---

```text
POST /api/tasks/[id]/messages
```

Used to send a message associated with a task.

---

## Conversation API

```text
/api/conversations/[id]
```

Used for operations associated with an individual conversation, depending on the implemented backend functionality.

---

# 🔄 Messaging Flow

The general messaging flow is:

```text
User Login
     │
     ▼
Authentication
     │
     ▼
Messages Page
     │
     ▼
Load Conversations
     │
     ▼
Select Conversation
     │
     ▼
Verify Authorization
     │
     ▼
Load Task Messages
     │
     ▼
Display Messages
     │
     ▼
Send Message
     │
     ▼
Backend Validation
     │
     ▼
Save Message to PostgreSQL
     │
     ▼
Refresh / Poll Messages
     │
     ▼
Recipient Sees Message
```

---

# ⚡ Real-Time / Near-Real-Time Messaging

The current implementation uses **polling** for near-real-time updates.

The client periodically requests updated conversation/message data instead of maintaining a persistent WebSocket connection.

### Current approach

```text
Client
  │
  │ Request messages
  ▼
API
  │
  ▼
PostgreSQL
  │
  ▼
API response
  │
  ▼
Client updates UI
```

### Future improvement

WebSockets or Server-Sent Events could be introduced if true real-time communication is required.

---

# 🔒 Authorization & Access Control

Access to task-related conversations is restricted.

The system verifies whether the authenticated user is authorized to access the conversation.

Expected authorized users include:

* Task owner
* Assigned service provider
* Authorized administrator for applicable disputed tasks

Unauthorized users should not be able to:

* View protected conversations
* Read protected task messages
* Send messages to unauthorized conversations
* Delete another user's messages

---

# 🧪 QA & Testing

Messaging functionality was tested using two separate user accounts.

### Test users

```text
User A
User B
```

Messages were exchanged in both directions to verify the messaging workflow.

---

## QA Checklist

### Authentication

* [x] Login required
* [x] Authenticated user can access messaging
* [x] Logged-out users cannot access protected chat functionality

### Conversations

* [x] Conversation list loads
* [x] Authorized users can open conversations
* [x] Unauthorized users cannot access protected conversations
* [ ] Multiple conversation scenarios should be rechecked after future changes
* [ ] Empty conversation state should be verified

### Sending Messages

* [x] User A can send a message
* [x] User B can receive the message
* [x] User B can reply
* [x] User A can receive the reply
* [x] Message body is displayed correctly
* [x] Timestamp is displayed

### Read / Unread

* [x] Read/unread information is available
* [x] Unread indicator works
* [x] Unread divider works
* [x] Unread count works
* [x] Read status updates correctly

### Persistence

* [x] Messages remain after page refresh
* [x] Conversation history is preserved
* [x] Messages are stored in the database

### Message Security

* [x] User can delete their own message
* [x] User cannot delete another user's message
* [x] Authorization is checked by the backend

### Responsive UI

* [ ] Final desktop verification
* [ ] Final tablet verification
* [ ] Final mobile verification

### Production

* [ ] Production deployment verification
* [ ] Production database connection verification
* [ ] Production environment variables verification
* [ ] Production messaging end-to-end test

---

# 🔐 Security Checklist

Before committing or deploying:

* [x] `.env.local` is not committed
* [x] Database credentials are stored through environment variables
* [x] Authentication is required
* [x] Conversation authorization is implemented
* [x] Message ownership is validated
* [x] Unauthorized conversation access is blocked
* [x] Users cannot delete other users' messages
* [ ] Production environment variables should be reviewed before final deployment
* [ ] Final production security testing should be completed after deployment

---

# 🚢 Deployment Checklist

Before deploying to Vercel:

### 1. Install dependencies

```bash
npm install
```

### 2. Run production build

```bash
npm run build
```

### 3. Verify build

Confirm that:

* Build completes successfully
* No TypeScript errors occur
* No compilation errors occur
* Required routes are generated

### 4. Configure environment variables

Add production environment variables in the deployment platform.

Example:

```text
DATABASE_URL
```

Do not place production secrets directly inside source code.

### 5. Deploy

Deploy the application through the configured Vercel project.

### 6. Verify production

After deployment, verify:

```text
Application loads
        ↓
Login works
        ↓
Messages page opens
        ↓
Conversations load
        ↓
Messages can be sent
        ↓
Messages are received
        ↓
Messages persist
        ↓
Read/unread status works
        ↓
Unauthorized access is blocked
```

---

# 🌐 Production Application

Production URL:

```text
https://kaamkaro-six.vercel.app
```

> The production URL should be re-verified after each deployment because deployment configuration may change.

---

# 🧰 Useful Commands

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build production application

```bash
npm run build
```

### Start production server

```bash
npm start
```

### Check Git status

```bash
git status
```

### Check branches

```bash
git branch
```

### Pull latest changes

```bash
git pull
```

### Push changes

```bash
git push
```

---

# 🌿 Git Workflow

Recommended workflow:

```bash
git checkout main
git pull
```

Create a feature branch:

```bash
git checkout -b feature/messaging
```

Make changes and test them.

Check modified files:

```bash
git status
```

Stage changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Complete messaging feature"
```

Push:

```bash
git push -u origin feature/messaging
```

Then create a Pull Request for review.

---

# 📝 Documentation

The project documentation covers:

* Messaging functionality
* API routes
* Database integration
* Authentication
* Authorization
* QA testing
* Security checks
* Build verification
* Deployment checklist

---

# 🐛 Troubleshooting

## Application does not start

Try:

```bash
npm install
npm run dev
```

If the problem continues, check:

```bash
node -v
npm -v
```

---

## Database connection error

Check that `.env.local` exists and contains a valid:

```env
DATABASE_URL="..."
```

Restart the development server after changing environment variables.

---

## Messages are not loading

Check:

1. User is authenticated.
2. User has access to the relevant task/conversation.
3. Database connection is working.
4. API routes are responding correctly.
5. Browser console for frontend errors.
6. Terminal for backend/server errors.

---

## Production build fails

Run:

```bash
npm run build
```

Read the first error reported by Next.js and fix it before attempting deployment again.

---

# 🔮 Future Improvements

Potential future enhancements include:

* WebSocket-based real-time messaging
* Typing indicators
* Online/offline status
* Message reactions
* File/image attachments
* Message editing
* Message search
* Push notifications
* Email notifications
* Conversation archiving
* Message pagination
* Rate limiting
* Advanced moderation
* Message reporting
* Delivery status
* Improved mobile UI
* Automated end-to-end testing

---

# 📊 Current Project Status

| Area                               | Status                        |
| ---------------------------------- | ----------------------------- |
| Messaging UI                       | ✅ Completed                   |
| Conversation loading               | ✅ Completed                   |
| Send messages                      | ✅ Completed                   |
| Receive messages                   | ✅ Completed                   |
| Message persistence                | ✅ Completed                   |
| Timestamps                         | ✅ Completed                   |
| Read/unread indicators             | ✅ Completed                   |
| Unread count/divider               | ✅ Completed                   |
| Message ownership validation       | ✅ Completed                   |
| Conversation authorization         | ✅ Completed                   |
| QA documentation                   | ✅ Completed                   |
| Production build                   | ✅ Verified                    |
| Responsive final verification      | 🔲 Pending final check        |
| Production end-to-end verification | 🔲 Pending final verification |

---

# 👩‍💻 QA, Integration & Deployment Lead

**Prabhavati S. Agre**

Responsibilities:

* Functional testing
* Messaging QA
* Security and authorization validation
* Integration verification
* Production build verification
* Environment configuration checks
* Deployment verification
* Documentation
* Final QA reporting

---

# 📄 License

This project is developed as part of the KaamKaro.ai project and is subject to the project's applicable ownership and usage terms.

---

# 🙏 Acknowledgement

This messaging feature was developed and validated as a collaborative effort involving frontend development, backend development, QA, integration, documentation, and deployment activities.
