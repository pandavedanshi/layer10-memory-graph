---
title: Layer10 UI
emoji: 🕸️
colorFrom: indigo
colorTo: blue
sdk: static
pinned: false
---

# Layer10 Memory Graph — Frontend

Interactive knowledge graph visualization built with React and ForceGraph2D.

## Features

- **Knowledge Graph** — interactive force-directed graph with 111 nodes and 50 edges
- **Filters** — filter by entity type, relationship type, degree, and node name
- **Analytics** — entity type distribution, top relationship types, most connected nodes
- **Node Explorer** — inspect any node's incoming and outgoing relationships
- **Query** — search the graph via the FastAPI backend and highlight matching nodes

## Stack

- **React** — frontend framework
- **react-force-graph-2d** — WebGL graph rendering
- **Axios** — API calls to the FastAPI backend
- **Orbitron + Share Tech Mono** — robotic HUD-style fonts

## Local Development

```bash
cd ui
npm install
npm start
```

Make sure the backend is running at `http://localhost:8000` before starting.

## Deployment

The frontend talks to the backend at:
`https://pandavedanshi-layer10-api.hf.space`

Built with `npm run build` and deployed as a static site on Hugging Face Spaces.