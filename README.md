# Real-Time Client Project Dashboard

A full-stack real-time project management dashboard for agencies to manage clients, projects, tasks, team activity, and notifications.

The application implements JWT authentication, role-based access control, PostgreSQL persistence, Prisma ORM, Socket.IO real-time updates, background overdue-task processing, and database-backed activity history.

---

## Features

### Authentication and authorization

- JWT-based authentication
- Short-lived access token
- Refresh token stored in an HttpOnly cookie
- Logout and refresh-token handling
- Three user roles:
  - Admin
  - Project Manager
  - Developer
- API-level authorization on protected routes
- Role-filtered project, task, activity, and notification access
- Developers can access only their assigned tasks
- Project Managers can manage only projects they created
- Administrators can access all authorized project data

### Project and task management

- Create and manage projects
- Assign projects to clients
- Create and manage tasks
- Assign tasks to developers
- Task statuses:
  - To Do
  - In Progress
  - In Review
  - Done
- Task priorities:
  - Low
  - Medium
  - High
  - Critical
- Due dates
- Overdue task flagging
- Task status-change history
- Database-persisted activity log

### Real-time activity feed

- Socket.IO-based real-time communication
- Live task status updates
- Project-specific activity rooms
- Role-filtered activity visibility
- Global activity feed for Administrators
- Project activity for Project Managers
- Assigned-task activity for Developers
- Database-backed missed-event catch-up after reconnecting
- Online presence count using WebSocket connections

### Dashboard and filters

- Project summary
- Task summary
- Tasks grouped by status
- Tasks grouped by priority
- Overdue task count
- Upcoming due dates
- Task filtering by:
  - Project
  - Status
  - Priority
  - Due-date range
- Query-parameter-based filtering for shareable URLs

### Notifications

- Notification when a task is assigned to a developer
- Notification to the relevant Project Manager when a task moves to In Review
- Unread notification count
- Notification dropdown
- Mark individual notification as read
- Mark all notifications as read
- Real-time unread-count updates through Socket.IO

### Background processing

- Scheduled background job for overdue tasks
- Overdue status is updated by the scheduled job rather than only during page load

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Socket.IO client

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- JWT
- bcrypt or equivalent password-hashing library
- Server-side validation

### Database

- PostgreSQL
- Prisma ORM

### Development and deployment

- npm workspaces
- Docker
- Docker Compose
- Vercel for frontend hosting
- Persistent Node.js hosting for the backend
- Managed PostgreSQL database

---

## Project Structure

```text
project-root/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── sockets/
│   │   │   ├── jobs/
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── lib/
│       │   ├── App.tsx
│       │   ├── App.css
│       │   └── main.tsx
│       └── package.json
│
├── package.json
├── package-lock.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
