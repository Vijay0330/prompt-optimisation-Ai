# Prompt Intelligence Assistant

A chat-style web application that analyzes user prompts and returns:
- ✅ An **optimized, actionable version** of your prompt
- ✅ A **skill persona** describing the ideal expert for the task
- ✅ **MCP tool suggestions** tailored to your use case

Built with **React + Vite + Tailwind CSS** (frontend) and **FastAPI + Google Gemini** (backend).

---

## Project Structure

```
Prompt Intelligence Assistant/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/
│   │   └── routes.py              # POST /api/prompt-analyze
│   ├── schemas/
│   │   └── models.py              # Pydantic request/response models
│   ├── services/
│   │   ├── prompt_analyzer.py     # Keyword extraction & task detection
│   │   ├── mcp_retriever.py       # Tool matching from knowledge base
│   │   └── ai_compiler.py         # Gemini API call & JSON parsing
│   ├── knowledge_base/
│   │   └── tools.json             # 20 MCP tool definitions
│   └── prompts/
│       └── system_prompt.txt      # Prompt template for Gemini
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Main app state & logic
│       ├── index.css
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── ChatMessage.jsx
│       │   ├── ResultCard.jsx
│       │   ├── ChatInput.jsx
│       │   ├── WelcomeScreen.jsx
│       │   └── LoadingBubble.jsx
│       ├── services/
│       │   └── api.js             # fetch wrapper for backend
│       └── types/
│           └── index.js
│
├── render.yaml                    # Render deployment config (backend)
└── README.md
```

---

## Quick Start

### 1. Get a Gemini API Key (Free)

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy the key

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Open .env and paste your Gemini API key:
# GEMINI_API_KEY=your_key_here

# Start the backend server
uvicorn main:app --reload --port 8000
```

Backend will be running at: `http://localhost:8000`
API docs available at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create your .env file (leave VITE_API_URL empty for local dev — Vite proxy handles it)
cp .env.example .env

# Start the dev server
npm run dev
```

Frontend will be running at: `http://localhost:5173`

---

## API Reference

### `POST /api/prompt-analyze`

**Request:**
```json
{
  "prompt": "Build a fraud detection system using machine learning"
}
```

**Response:**
```json
{
  "optimized_prompt": "Design and implement a real-time fraud detection system...",
  "skill_persona": "You are a senior data scientist with 10+ years of experience...",
  "mcp_suggestions": ["Vector Database", "Python Data Analysis", "Model Training Pipeline"]
}
```

---

## Deployment

### Backend → Render (Free)

1. Push your project to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo
4. Render auto-detects `render.yaml` — all settings are pre-configured
5. Add environment variable: `GEMINI_API_KEY = your_key`
6. Deploy — note your backend URL (e.g. `https://prompt-intelligence-backend.onrender.com`)

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo, set **Root Directory** to `frontend`
3. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
4. Deploy

---

## Future Enhancements

- [ ] Prompt quality scoring (1–10 with explanation)
- [ ] Prompt history with localStorage
- [ ] Semantic MCP retrieval using embeddings
- [ ] Agent-based MCP execution
- [ ] Prompt chaining and automation
- [ ] Export chat as PDF/Markdown

---

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | React 18, Vite, Tailwind CSS |
| Backend   | Python, FastAPI, Uvicorn    |
| AI Model  | Google Gemini 2.0 Flash     |
| Deploy FE | Vercel                      |
| Deploy BE | Render                      |


# Install training deps once (not in requirements.txt — only for training machine)
pip install transformers datasets torch accelerate huggingface_hub

# Run training
python scripts/train.py
