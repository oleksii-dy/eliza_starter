# Multi-Agent Sandbox Development Team Demo

## Scenario: Building a Todo List App

This demo showcases the complete workflow of spawning a multi-agent development team in an E2B sandbox to collaboratively build a todo list application.

## Prerequisites

1. **E2B Account & API Key**

   ```bash
   export E2B_API_KEY="your-e2b-api-key"
   ```

2. **Eliza CLI with Sandbox Plugin**

   ```bash
   npm install -g @elizaos/cli
   elizaos plugins add sandbox-dev-team
   ```

3. **Host Server Running**
   ```bash
   elizaos start --server --port 3000
   ```

## Demo Script

### 1. Initial Setup

**User Input:**

```
Create a todo list app with React, Express, and SQLite. I want users to be able to add, edit, delete, and mark todos as complete. Make it responsive and modern looking.
```

**Expected Agent Response:**

```
🚀 I'll spawn a development team to build your todo list app! Let me create a sandbox with specialized agents.

*Executing SPAWN_DEV_TEAM action...*

✅ Development Team Assembled!

Project: Todo List App
Sandbox ID: sandbox-1703123456789-abc123
Team Room: [todo-list-app-dev-team](#room/room-sandbox-1703123456789-abc123-1703123456)

Team Members:
- 🔧 Backend Agent: Ready for API development
- 🎨 Frontend Agent: Ready for UI/UX development
- ⚙️ DevOps Agent: Ready for infrastructure setup

Tech Stack:
- Frontend: React, Vite, TypeScript
- Backend: Express.js, Node.js
- Database: SQLite

The team is now planning your project architecture. Check the team room for real-time collaboration updates!
```

### 2. Team Introduction & Planning Phase

**In the Team Room:**

**DevOps Agent:**

```
👋 DevOps Agent here! I'm ready to set up the project infrastructure.

I'll start by:
1. Creating the project structure (frontend + backend)
2. Setting up build tools (Vite for frontend, Express for backend)
3. Configuring development environment
4. Setting up SQLite database schema

Give me 5 minutes to get the foundation ready!
```

**Backend Agent:**

```
🔧 Backend Agent reporting for duty!

For the todo API, I'm planning:
- RESTful endpoints: GET/POST/PUT/DELETE /api/todos
- SQLite database with todos table
- Input validation and error handling
- CORS setup for frontend integration

I'll wait for DevOps to set up the structure, then implement the API layer.
```

**Frontend Agent:**

```
🎨 Frontend Agent ready!

For the UI, I'm envisioning:
- Clean, modern todo interface with React
- Add/edit todo forms with validation
- Todo list with status filtering (all/active/completed)
- Responsive design using Tailwind CSS
- Smooth animations and interactions

I'll create reusable components and integrate with the backend API once it's ready.
```

### 3. Task Delegation

**User Input:**

```
Assign specific tasks to each team member. DevOps should set up the project, Backend should create the API, and Frontend should build the UI components.
```

**Expected Agent Response:**

```
📋 Tasks Delegated Successfully!

Created 6 tasks and assigned them to team members:

- Set up project structure and build system → @devops (high priority)
- Configure development environment → @devops (high priority)
- Create SQLite schema and database setup → @backend (high priority)
- Build REST API endpoints for todos → @backend (high priority)
- Create React component structure → @frontend (high priority)
- Implement responsive todo interface → @frontend (medium priority)

All team members have been notified and can start working immediately. Track progress in this room!
```

### 4. Development Phase - Real-time Collaboration

**DevOps Agent Task Updates:**

```
🔄 Starting project structure setup...

✅ Task Complete: Set up project structure
- Created /workspace/todo-app with frontend/ and backend/ directories
- Configured Vite for React frontend
- Set up Express.js backend with TypeScript
- Added package.json files with dependencies
- Created docker-compose.yml for easy deployment

📁 Project structure:
```

todo-app/
├── frontend/
│ ├── src/
│ ├── package.json
│ └── vite.config.ts
├── backend/
│ ├── src/
│ ├── package.json
│ └── tsconfig.json
└── docker-compose.yml

```

Files synced to team workspace. Backend and Frontend can now start development!
```

**Backend Agent Development:**

```
🔧 Starting API development...

✅ Task Complete: Create SQLite schema and database setup
- Created todos table with id, title, description, completed, created_at
- Set up database connection with better-sqlite3
- Added database initialization script

🔄 Working on: REST API endpoints
- ✅ GET /api/todos - List all todos
- ✅ POST /api/todos - Create new todo
- ✅ PUT /api/todos/:id - Update todo
- ✅ DELETE /api/todos/:id - Delete todo
- ✅ PATCH /api/todos/:id/toggle - Toggle completion

API is live on http://localhost:3001/api/todos
Frontend team can start integration!
```

**Frontend Agent Development:**

```
🎨 Building the user interface...

✅ Task Complete: React component structure
- Created TodoApp main component
- Built TodoList, TodoItem, and AddTodo components
- Set up React Router for potential future pages
- Added Tailwind CSS for styling

🔄 Working on: Todo interface implementation
- ✅ Add todo form with validation
- ✅ Todo list with status filtering
- ✅ Edit todo inline functionality
- ✅ Delete todo with confirmation
- ✅ Responsive design for mobile/desktop

✨ UI Features implemented:
- Real-time todo updates
- Smooth animations
- Dark/light mode toggle
- Keyboard shortcuts (Enter to add, Esc to cancel)
- Auto-save on edit

Frontend ready for testing!
```

### 5. Integration & Testing

**Team Status Update:**

```
📊 Sprint Progress Update

✅ DevOps Tasks: 2/2 complete
- Project structure ✅
- Development environment ✅

✅ Backend Tasks: 2/2 complete
- Database schema ✅
- REST API endpoints ✅

✅ Frontend Tasks: 2/2 complete
- Component structure ✅
- Todo interface ✅

🎉 TODO LIST APP IS READY!

Demo available at: http://localhost:3000
API documentation: http://localhost:3001/api/docs

All team members collaborated successfully to deliver a complete, production-ready todo application!
```

### 6. Final Demonstration

**User can now:**

1. **View the app:** `curl http://localhost:3000`
2. **Test the API:** `curl http://localhost:3001/api/todos`
3. **Use the interface:** Open browser to see the working todo app

**Features delivered:**

- ✅ Add new todos with validation
- ✅ Mark todos as complete/incomplete
- ✅ Edit todos inline
- ✅ Delete todos with confirmation
- ✅ Filter todos (all/active/completed)
- ✅ Responsive design
- ✅ Data persistence with SQLite
- ✅ Modern, clean UI with animations

## Technical Implementation Details

### E2B Sandbox Configuration

```yaml
# sandbox-template.yaml
template_id: 'eliza-dev-team'
base_image: 'node:20-alpine'
packages:
  - git
  - sqlite
  - python3
tools:
  - npm
  - vite
  - express-generator
ports:
  - 3000:3000 # Frontend
  - 3001:3001 # Backend
  - 8081:8081 # WebSocket bridge
```

### WebSocket Communication Flow

```
Host Server ←→ WebSocket Bridge ←→ Sandbox Agents
     ↓              ↓                    ↓
Team Room ←→ Message Router ←→ Agent Collaboration
```

### File Synchronization

- Real-time sync between agents
- Version control for collaborative editing
- Conflict resolution for simultaneous changes

## Benefits Demonstrated

1. **Autonomous Development:** Agents work independently on their specialties
2. **Real-time Collaboration:** Live communication and file sharing
3. **Professional Workflow:** Proper task delegation and progress tracking
4. **Complete Delivery:** From requirements to working application
5. **Scalable Architecture:** Easy to add more agents or projects
6. **Isolated Environment:** Safe sandbox execution with cleanup

## Next Steps & Extensions

1. **Add Testing Agent:** Automated testing and quality assurance
2. **Add Design Agent:** UI/UX design and prototyping
3. **Add Security Agent:** Security audits and penetration testing
4. **Multi-project Support:** Multiple teams working on different projects
5. **AI Code Review:** Automated code review and suggestions
6. **Deployment Pipeline:** Automated deployment to staging/production

This demo showcases the future of AI-powered software development teams! 🚀
