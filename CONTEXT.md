# PROJECT CONTEXT — Prompt Intelligence Assistant
## AI Continuity Document · Read this first in every new session

> **Purpose:** Full ground-truth context for any AI or developer picking this project up.
> Every file, every decision, every pattern is documented here. No guessing. No hallucinating.

---

## 1. Project Summary

**Name:** Prompt Intelligence Assistant
**Version:** 2.0.0 (Phase 3 complete)
**Type:** Full-stack web application with user accounts, chat history, and 3 AI modes
**Status:** ✅ All files written. Needs `.env` MongoDB URI filled in, then run.
**Location:** `/home/vijay/Prompt Intelligence Assistant/`

**What it does:**
A Claude/ChatGPT-style chat app with 3 operating modes:
1. **Prompt Optimization** — rewrites vague prompts into clear, actionable ones + expert persona + MCP tool suggestions
2. **Summarise** — takes any pasted text and returns TL;DR + key points + read time
3. **Chat with Agent** — full conversational AI with memory (loads history from MongoDB)

Users sign up with email/password. All chats and messages are persisted in MongoDB Atlas.
The AI backend uses Google Gemini (free tier). JWT auth via httpOnly cookies.

---

## 2. Architecture Overview

```
Browser (React + Vite + Tailwind)
    │
    │  httpOnly cookie (JWT)
    │  POST /api/prompt-analyze  { prompt, mode, model, chat_id }
    │
FastAPI Backend (Python)
    │
    ├── Auth middleware (JWT decode from cookie)
    ├── Casual responder (intercepts greetings, no AI call)
    │
    ├── MODE: prompt_optimization
    │       → prompt_analyzer.py  (keywords + task type)
    │       → mcp_retriever.py    (score tools from tools.json)
    │       → ai_compiler.py      (Gemini → structured JSON)
    │
    ├── MODE: summarise
    │       → summariser.py       (Gemini → TL;DR + key_points + read_time JSON)
    │
    └── MODE: agent
            → chat_agent.py       (load last 10 msgs from MongoDB → Gemini → plain text)
    │
MongoDB Atlas
    ├── users      { email, hashed_password, preferred_model, created_at }
    ├── chats      { user_id, title, mode, model, created_at, updated_at }
    └── messages   { chat_id, user_id, role, content, mode, result, summary, casual_reply, created_at }
```

---

## 3. Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, modern JSX, industry standard |
| Styling | Tailwind CSS v3 + Typography plugin | Utility-first, dark theme, prose for markdown |
| Routing | react-router-dom v6 | Client-side routing for Login/Register/Chat pages |
| Markdown rendering | react-markdown v9 | Agent mode responses support markdown |
| Backend framework | Python FastAPI | Async, Pydantic validation, auto docs |
| ASGI server | Uvicorn | Production-grade async server |
| AI model | Google Gemini 2.0 Flash | Free tier, JSON output, no local GPU needed |
| HTTP client | httpx | Async-native, works with FastAPI async |
| Database | MongoDB Atlas (Motor async driver) | Flexible schema, free M0 tier, async support |
| Auth | JWT (python-jose) + bcrypt (passlib) | Stateless, secure, httpOnly cookie storage |
| Env management | python-dotenv | .env file loading |
| Frontend deploy | Vercel | Free static hosting, Vite-native |
| Backend deploy | Render | Free Python hosting, render.yaml config |

---

## 4. Complete File Tree

```
Prompt Intelligence Assistant/
├── CONTEXT.md                              ← THIS FILE
├── README.md
├── render.yaml                             ← Render deploy (backend) — updated Phase 3
│
├── backend/
│   ├── main.py                             ← FastAPI app, lifespan DB connect, 3 routers
│   ├── requirements.txt                    ← All Python deps including motor, jose, passlib
│   ├── .env                                ← Real secrets (never commit)
│   ├── .env.example                        ← Template for all 6 env vars
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py                     ← Motor async client, connect_db/close_db/get_database
│   │   └── security.py                     ← bcrypt hash/verify, JWT create/decode, cookie dependency
│   │
│   ├── models/                             ← MongoDB document factories (not Pydantic)
│   │   ├── __init__.py
│   │   ├── user.py                         ← new_user_doc()
│   │   ├── chat.py                         ← new_chat_doc(), chat_to_json()
│   │   └── message.py                      ← new_message_doc(), message_to_json()
│   │
│   ├── schemas/
│   │   └── models.py                       ← All Pydantic schemas: auth, chats, prompts, modes
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py                         ← /auth/register, /auth/login, /auth/logout, /auth/me, /auth/model
│   │   ├── chats.py                        ← /chats CRUD + /chats/{id}/title
│   │   └── routes.py                       ← /prompt-analyze — mode routing + MongoDB persistence
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── prompt_analyzer.py              ← keyword extraction, task type detection (unchanged)
│   │   ├── mcp_retriever.py                ← scored tool matching (unchanged)
│   │   ├── ai_compiler.py                  ← Gemini call, dynamic model param, JSON parser
│   │   ├── summariser.py                   ← NEW: summarise mode Gemini call
│   │   ├── chat_agent.py                   ← NEW: agent mode, MEMORY_WINDOW=10, history formatting
│   │   └── casual_responder.py             ← greeting intercept, random replies (unchanged)
│   │
│   ├── knowledge_base/
│   │   └── tools.json                      ← 20 MCP tool definitions (unchanged)
│   │
│   └── prompts/
│       ├── system_prompt.txt               ← Prompt optimization template (unchanged)
│       ├── summarise_prompt.txt            ← NEW: summarise template
│       └── agent_prompt.txt                ← NEW: agent conversation template
│
└── frontend/
    ├── index.html                          ← Vite entry, Inter font
    ├── package.json                        ← Added: react-router-dom, react-markdown, @tailwindcss/typography
    ├── vite.config.js                      ← /api proxy → localhost:8000
    ├── tailwind.config.js                  ← Added: violet + emerald colors, typography plugin
    ├── postcss.config.js
    ├── vercel.json                         ← SPA rewrite rules
    ├── .env.example                        ← VITE_API_URL
    │
    └── src/
        ├── main.jsx                        ← ReactDOM.createRoot entry
        ├── App.jsx                         ← React Router: /login, /register, / (protected)
        ├── index.css                       ← Tailwind directives + prose overrides + scrollbar utils
        │
        ├── context/
        │   └── AuthContext.jsx             ← Global user state, login/logout/updateModel
        │
        ├── pages/
        │   ├── LoginPage.jsx               ← Email + password sign in form
        │   ├── RegisterPage.jsx            ← Registration with confirm password
        │   └── ChatPage.jsx                ← Main app: sidebar + chat + mode selector
        │
        ├── components/
        │   ├── Header.jsx                  ← Logo, user email, ModelPicker, logout button
        │   ├── Sidebar.jsx                 ← Chat history list, date groups, delete, new chat
        │   ├── ModeSelector.jsx            ← 3-tab switcher above input
        │   ├── ModelPicker.jsx             ← Gemini model dropdown, saves to user profile
        │   ├── ChatMessage.jsx             ← Routes to correct renderer by mode
        │   ├── ResultCard.jsx              ← Prompt optimization output (3 panels)
        │   ├── SummaryCard.jsx             ← TL;DR + key points + read time
        │   ├── AgentMessage.jsx            ← react-markdown renderer for agent replies
        │   ├── ChatInput.jsx               ← Textarea + send, mode-aware placeholder
        │   ├── WelcomeScreen.jsx           ← Mode-specific empty state + example prompts
        │   └── LoadingBubble.jsx           ← Animated dots while API call runs
        │
        ├── services/
        │   ├── api.js                      ← analyzePrompt(prompt, mode, model, chatId)
        │   ├── auth.js                     ← login, register, logout, getMe, updatePreferredModel
        │   └── chats.js                    ← getChats, createChat, getChatById, deleteChat, updateTitle
        │
        └── types/
            └── index.js                    ← JSDoc type definitions
```

---

## 5. Environment Variables

### Backend (`backend/.env`)
```
GEMINI_API_KEY=your_gemini_key           # https://aistudio.google.com/app/apikey
MONGODB_URI=mongodb+srv://...            # MongoDB Atlas connection string
MONGODB_DB_NAME=promptai                 # Database name
JWT_SECRET=min-32-char-random-string     # Any long random string
JWT_EXPIRE_MINUTES=10080                 # 7 days
ENV=development                          # Set to "production" on Render (enables secure cookies)
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=                            # Empty = use Vite proxy in dev
                                         # Set to https://your-backend.onrender.com/api in prod
```

---

## 6. API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account → sets httpOnly JWT cookie |
| POST | /api/auth/login | Sign in → sets httpOnly JWT cookie |
| POST | /api/auth/logout | Clears cookie |
| GET | /api/auth/me | Returns current user (requires cookie) |
| PATCH | /api/auth/model | Update preferred_model for user |

### Chats
| Method | Path | Description |
|---|---|---|
| GET | /api/chats | List all chats for user (newest first) |
| POST | /api/chats | Create new chat session |
| GET | /api/chats/{id} | Load chat + all messages |
| PATCH | /api/chats/{id}/title | Rename chat |
| DELETE | /api/chats/{id} | Delete chat + all its messages |

### Prompt Analysis
| Method | Path | Description |
|---|---|---|
| POST | /api/prompt-analyze | Main endpoint — handles all 3 modes |

**Request body:**
```json
{
  "prompt": "user text here",
  "mode": "prompt_optimization | summarise | agent",
  "model": "gemini-2.0-flash",
  "chat_id": "optional — if null, auto-creates new chat"
}
```

**Response varies by mode:**
```json
// prompt_optimization
{ "optimized_prompt": "", "skill_persona": "", "mcp_suggestions": [], "chat_id": "", "mode": "" }

// summarise
{ "summary": { "tldr": "", "key_points": [], "read_time": "" }, "chat_id": "", "mode": "" }

// agent
{ "agent_reply": "markdown string", "chat_id": "", "mode": "" }

// casual (any mode)
{ "casual_reply": "Hey! What are we building?", "chat_id": "", "mode": "" }
```

---

## 7. MongoDB Collections

### `users`
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "hashed_password": "bcrypt hash",
  "preferred_model": "gemini-2.0-flash",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### `chats`
```json
{
  "_id": ObjectId,
  "user_id": "string (ObjectId of user)",
  "title": "First 60 chars of first prompt",
  "mode": "prompt_optimization | summarise | agent",
  "model": "gemini-2.0-flash",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### `messages`
```json
{
  "_id": ObjectId,
  "chat_id": "string (ObjectId of chat)",
  "user_id": "string (ObjectId of user)",
  "role": "user | assistant | error",
  "content": "text (used for user msgs + agent replies)",
  "mode": "prompt_optimization | summarise | agent",
  "result": { "optimized_prompt": "", "skill_persona": "", "mcp_suggestions": [] },
  "summary": { "tldr": "", "key_points": [], "read_time": "" },
  "casual_reply": "string | null",
  "created_at": ISODate
}
```

---

## 8. Frontend State Flow (ChatPage.jsx)

```
ChatPage state:
  messages[]         — local message objects for the current chat
  activeChatId       — MongoDB ObjectId string of the current chat (null = new)
  mode               — "prompt_optimization" | "summarise" | "agent"
  isLoading          — true while API call is in-flight
  sidebarRefresh     — counter, increment to tell Sidebar to reload its chat list

Flow when user sends a message:
  1. Add user bubble to messages[] optimistically
  2. Set isLoading = true
  3. Call analyzePrompt(prompt, mode, model, activeChatId)
  4. If activeChatId was null AND data.chat_id is returned → setActiveChatId + setSidebarRefresh++
  5. Build assistant message from response fields (result / summary / agent_reply / casual_reply)
  6. Append to messages[]
  7. Set isLoading = false

Flow when user clicks a sidebar chat:
  1. Call getChatById(chat.id) → returns { chat, messages[] }
  2. setActiveChatId(chat.id), setMode(chat.mode)
  3. Map DB messages → local shape via dbMsgToLocal()
  4. Replace messages[] with loaded history
```

---

## 9. Auth Flow

```
Register/Login:
  1. Frontend POST /api/auth/register or /api/auth/login
  2. Backend verifies credentials, calls create_access_token()
  3. Backend calls response.set_cookie(key="access_token", httponly=True, samesite="lax")
  4. Cookie is stored by browser automatically — JS cannot read it
  5. All subsequent API calls include credentials: 'include' → cookie sent automatically

Protected routes:
  1. FastAPI routes use Depends(get_current_user)
  2. get_current_user() reads cookie from request, decodes JWT
  3. Returns { sub: user_id, email: email } as current_user dict
  4. On invalid/expired token → 401 HTTPException

Session check on page load:
  1. AuthContext calls getMe() on mount
  2. GET /api/auth/me → if cookie valid, returns user object
  3. If 401 → setUser(null) → React Router redirects to /login
```

---

## 10. How to Run Locally

```bash
# ── Backend ──────────────────────────────────────────────────────────────────
cd "/home/vijay/Prompt Intelligence Assistant/backend"
source venv/bin/activate
pip install -r requirements.txt

# Edit .env — fill in MONGODB_URI and JWT_SECRET
nano .env

uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger auto-docs)

# ── Frontend ─────────────────────────────────────────────────────────────────
cd "/home/vijay/Prompt Intelligence Assistant/frontend"
npm install
npm run dev
# → http://localhost:5173
```

---

## 11. Python Dependencies

```
fastapi==0.115.0
uvicorn[standard]==0.31.1
httpx==0.27.2
pydantic==2.11.5
pydantic[email]==2.11.5
python-dotenv==1.0.1
motor==3.6.0
pymongo==4.10.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

## 12. Frontend npm Dependencies

```json
Dependencies:
  react@^18.3.1
  react-dom@^18.3.1
  react-router-dom@^6.24.1
  react-markdown@^9.0.1

DevDependencies:
  @tailwindcss/typography@^0.5.13
  @vitejs/plugin-react@^4.3.1
  vite@^5.3.1
  tailwindcss@^3.4.4
  autoprefixer@^10.4.19
  postcss@^8.4.38
```

---

## 13. Gemini Models Available

| Model ID | Label | Speed | Use |
|---|---|---|---|
| `gemini-2.0-flash` | Gemini 2.0 Flash | Fast | **Default** |
| `gemini-2.0-flash-lite` | Gemini 2.0 Flash Lite | Fastest | Light tasks |
| `gemini-1.5-pro` | Gemini 1.5 Pro | Slow | Complex reasoning |
| `gemini-1.5-flash` | Gemini 1.5 Flash | Medium | Balanced |

Model stored in `users.preferred_model`. Sent with every request as `model` field.
Backend uses it dynamically via `_build_url(model)` in each service.

---

## 14. Casual Responder System

Intercepts greetings/small-talk BEFORE any AI call. Covers 10 pattern groups:
greetings, how-are-you, good-morning/night, thanks, bye, ok/cool, lol/haha,
who-are-you, what-can-you-do, test/ping.

Responds with random handwritten replies that rotate — never feels robotic.
Returns `casual_reply` field in response. No AI call made. Instant response.

---

## 15. Known Constraints & Gotchas

1. **MONGODB_URI must be filled** in `.env` before running. Backend will crash on startup if missing.
2. **JWT_SECRET must be at least 32 chars** — python-jose will error with short secrets.
3. **Cookie `secure=True`** only in production (ENV=production). In dev, `secure=False` so it works over HTTP.
4. **react-markdown v9** uses ESM — must have `"type": "module"` in package.json (already set).
5. **`@tailwindcss/typography`** must be in devDependencies AND in tailwind.config.js `plugins` array.
6. **Agent memory window** is last 10 messages (MEMORY_WINDOW=10 in chat_agent.py). Adjustable.
7. **Chat title** is auto-set from the first 60 chars of the user's first prompt.
8. **Sidebar refresh** is triggered by `sidebarRefresh` counter in ChatPage — increment it whenever a new chat is created.
9. **Gemini free tier**: 15 requests/minute. Retry logic is built in (3 retries: 5s/15s/30s backoff).
10. **`credentials: 'include'`** must be on every fetch call for the httpOnly cookie to be sent.

---

## 16. Phases Completed

| Phase | What was built |
|---|---|
| Phase 1 | Core backend (FastAPI, Gemini, prompt analyzer, MCP retriever, tools.json) |
| Phase 2 | React frontend (chat UI, ResultCard, WelcomeScreen, Tailwind dark theme) |
| Phase 2.1 | Casual responder system (greeting intercept, random soulful replies) |
| Phase 2.2 | Gemini retry logic (429 handling, 3 retries with backoff) |
| Phase 3 | User management (JWT + MongoDB), chat history, sidebar, 3 modes (optimization/summarise/agent), model picker |

## 17. Future Enhancements (not yet built)

- [ ] Prompt quality scoring (1–10 with explanation)
- [ ] Export chat as PDF or Markdown
- [ ] Semantic MCP tool retrieval using embeddings
- [ ] Streaming responses for agent mode
- [ ] Prompt chaining and automation
- [ ] Admin dashboard

---

*Last updated: Phase 3 complete. All 38 files written.*
*Next step: Fill in MONGODB_URI + JWT_SECRET in backend/.env, then `pip install -r requirements.txt` and `npm install`.*
