import json
import networkx as nx
from networkx.readwrite import json_graph
import os

def canonicalize(name):
    return str(name).lower().strip() if name else ""

def build_memory_graph():
    print("Building Memory Graph...")
    path = os.path.join("data", "extracted_graph.json")
    if not os.path.exists(path):
        print("❌ extracted_graph.json not found!")
        return
    
    with open(path, "r", encoding="utf-8") as f: 
        raw_data = json.load(f)
        
    G = nx.MultiDiGraph() # MultiDiGraph allows parallel edges

    for item in raw_data:
        source_url = item.get("source_id", "")
        graph_data = item.get("graph_data", {})

        # 1. Add Explicit Entities
        for entity in graph_data.get("entities", []):
            node_id = canonicalize(entity.get("name"))
            if node_id:
                if not G.has_node(node_id):
                    # Added display_name for the UI
                    G.add_node(node_id, 
                               display_name=entity.get("name"), 
                               type=entity.get("type", "Unknown"), 
                               description=entity.get("description", ""), 
                               evidence=[])
                
                G.nodes[node_id]["evidence"].append({
                    "source": source_url, 
                    "quote": entity.get("text_excerpt", "")
                })

        # 2. Add Relationships (LOOSE MODE)
        for rel in graph_data.get("relationships", []):
            src, tgt = canonicalize(rel.get("source")), canonicalize(rel.get("target"))
            
            if src and tgt:
                # If the LLM found a relationship but missed the entity, create a placeholder node
                if not G.has_node(src):
                    G.add_node(src, display_name=rel.get("source"), type="Unknown", evidence=[])
                if not G.has_node(tgt):
                    G.add_node(tgt, display_name=rel.get("target"), type="Unknown", evidence=[])
                
                # Changed 'type' to 'relationship' to match the Streamlit frontend
                G.add_edge(src, tgt, 
                           relationship=rel.get("relation_type", "related"), 
                           source_id=source_url)

    # Save for Frontend (Ensure Streamlit is reading from knowledge_graph.json)
    output_path = os.path.join("data", "knowledge_graph.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(json_graph.node_link_data(G), f, indent=4)
        
    print(f"✅ Graph Ready: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")

if __name__ == "__main__":
    build_memory_graph()