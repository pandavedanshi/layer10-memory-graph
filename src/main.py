from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAPH_PATH = os.path.join("data", "memory_graph.json")

# fallback to knowledge_graph.json if memory_graph.json not found
if not os.path.exists(GRAPH_PATH):
    GRAPH_PATH = os.path.join("data", "knowledge_graph.json")


@app.get("/graph")
def get_graph():
    if not os.path.exists(GRAPH_PATH):
        return {"nodes": [], "links": []}

    with open(GRAPH_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])

    # Build index → id map for networkx integer-index links
    index_to_id = {}
    for i, n in enumerate(nodes):
        index_to_id[i] = n.get("id", str(i))

    # networkx exports "edges" not "links" — normalise to "links"
    raw_links = data.get("links", data.get("edges", []))

    links = []
    for l in raw_links:
        src = l.get("source")
        tgt = l.get("target")
        # Resolve integer indices to string IDs
        if isinstance(src, int):
            src = index_to_id.get(src, src)
        if isinstance(tgt, int):
            tgt = index_to_id.get(tgt, tgt)
        links.append({**l, "source": src, "target": tgt})

    return {"nodes": nodes, "links": links}


@app.get("/retrieve")
def retrieve(query: str):
    if not os.path.exists(GRAPH_PATH):
        return {"context_pack": []}

    with open(GRAPH_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    results = []
    q = query.lower()

    for node in data.get("nodes", []):
        node_id   = str(node.get("id", ""))
        node_type = str(node.get("type", "Unknown"))
        node_desc = str(node.get("description", node.get("summary", "")))

        if q in node_id.lower() or q in node_desc.lower():
            results.append({
                "entity":      node_id,
                "type":        node_type,
                "description": node_desc or f"{node_type} entity",
            })

    return {"context_pack": results[:10]}


@app.get("/health")
def health():
    return {"status": "ok", "graph": os.path.exists(GRAPH_PATH)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)