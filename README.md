---
title: Layer10 Api
emoji: 🧠
colorFrom: blue
colorTo: cyan
sdk: docker
app_port: 7860
pinned: false
---

# 🧠 Layer10 Memory Graph

An organizational knowledge graph built from GitHub issues using LLMs — visualized as an interactive force-directed graph.

---

## 📁 Project Structure

```
layer10-memory-graph/
├── Dockerfile              # Backend container for Hugging Face
├── README.md               # This file
├── requirements.txt        # Python dependencies
├── src/
│   ├── main.py             # FastAPI backend
│   ├── graph.py            # Graph building logic
│   ├── extraction.py       # LLM entity extraction
│   └── ingestion.py        # Data ingestion
├── data/
│   └── memory_graph.json   # Knowledge graph (139 nodes, 81 edges)
└── ui/                     # React frontend
    ├── src/
    │   ├── App.js
    │   └── App.css
    └── package.json
```

---

## 🔧 Backend — FastAPI

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph` | Returns all nodes and edges as `{nodes, links}` |
| GET | `/retrieve?query=` | Search over graph nodes, returns `{context_pack}` |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive Swagger UI |

### Stack
- **FastAPI** — REST API
- **NetworkX** — graph data structure
- **Uvicorn** — ASGI server
- **Docker** — containerized deployment

### Local Development

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn src.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

### Deployment — Hugging Face Spaces (Docker)

1. Go to [huggingface.co](https://huggingface.co) → New Space
2. Name: `layer10-api` · SDK: **Docker**
3. Push repo with `Dockerfile`, `src/`, `data/`, `README.md`
4. Space auto-builds and runs on port 7860

Live at: `https://Vedanshipanda-layer10-api.hf.space`

---

## 🖥️ Frontend — React

### Features

- **Knowledge Graph** — interactive force-directed graph with glowing nodes and animated edges
- **Filters** — filter by entity type, relationship type, min degree, max nodes
- **Analytics** — type distribution charts, top relationship types, most connected nodes table
- **Node Explorer** — inspect any node's incoming and outgoing relationships
- **Query** — search the graph via backend API and highlight matching nodes

### Stack
- **React** — frontend framework
- **react-force-graph-2d** — WebGL graph rendering
- **Axios** — API calls
- **Orbitron + Share Tech Mono** — robotic HUD-style fonts

### Local Development

```bash
cd ui
npm install
npm start
```

Make sure the backend is running at `http://localhost:8000` first.

### Deployment — Hugging Face Spaces (Static)

1. Go to [huggingface.co](https://huggingface.co) → New Space
2. Name: `layer10-ui` · SDK: **Static**
3. Build the frontend:
```bash
cd ui
npm run build
```
4. Upload everything inside `ui/build/` to the Space

Live at: `https://Vedanshipanda-layer10-ui.hf.space`

---

## 🚀 Full Stack Setup

| Service | URL |
|---------|-----|
| Backend API | `https://Vedanshipanda-layer10-api.hf.space` |
| Frontend UI | `https://Vedanshipanda-layer10-ui.hf.space` |
| API Docs | `https://Vedanshipanda-layer10-api.hf.space/docs` |

---

## 📊 Graph Stats

- **139 nodes** — Bugs, Developers, Features, Issues, Repositories, Technologies
- **81 edges** — relationships extracted from GitHub issues via LLM
- **6 entity types** — color-coded with neon glow in the visualization