from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows React app to connect
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. UPDATED FILE PATH
GRAPH_PATH = os.path.join("data", "knowledge_graph.json")

@app.get("/graph")
def get_graph():
    if os.path.exists(GRAPH_PATH):
        with open(GRAPH_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"nodes": [], "links": []}

@app.get("/retrieve")
def retrieve(query: str):
    if not os.path.exists(GRAPH_PATH): return {"context_pack": []}
    
    with open(GRAPH_PATH, "r", encoding="utf-8") as f: 
        data = json.load(f)
    
    results = []
    q = query.lower()
    for node in data.get("nodes", []):
        # Safely check if the query is in the node ID
        if q in str(node.get("id", "")).lower():
            results.append({
                "entity": node.get("id"), 
                "type": node.get("type"), 
                "evidence": node.get("evidence", [])
            })
            
    return {"context_pack": results[:5]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)