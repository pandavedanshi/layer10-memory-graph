---
title: Layer10 API
emoji: 🧠
colorFrom: blue
colorTo: cyan
sdk: docker
app_port: 7860
pinned: false
---

# Layer10 Memory Graph — Backend API

FastAPI backend that serves the organizational knowledge graph built from GitHub issues using LLMs.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph` | Returns all nodes and edges as `{nodes, links}` |
| GET | `/retrieve?query=` | Fuzzy search over graph nodes, returns `{context_pack}` |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive Swagger UI |

## Stack

- **FastAPI** — REST API
- **NetworkX** — graph data structure
- **Uvicorn** — ASGI server
- **Docker** — containerized deployment on Hugging Face Spaces

## Data

The graph is stored in `data/memory_graph.json` — a NetworkX node-link format JSON with 111 nodes and 50 edges extracted from GitHub issues via LLM.

## Local Development

```bash
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

API will be available at `http://localhost:8000/docs`