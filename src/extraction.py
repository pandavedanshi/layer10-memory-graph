import os
import json
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Setup Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('models/gemini-flash-latest',
                              generation_config={"response_mime_type": "application/json"})

RAW_DATA_PATH = os.path.join("data", "raw_corpus.json")
OUTPUT_PATH = os.path.join("data", "extracted_graph.json")

def load_data():
    if not os.path.exists(RAW_DATA_PATH):
        print(f"❌ Error: {RAW_DATA_PATH} not found.")
        return [], []
    with open(RAW_DATA_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    
    extracted_data = []
    if os.path.exists(OUTPUT_PATH):
        try:
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                extracted_data = json.load(f)
        except: pass
    return raw_data, extracted_data

def save_progress(data):
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print(f"💾 Saved {len(data)} items to disk.")

def extract_batch(items):
    batched_text = ""
    for i, item in enumerate(items):
        uid = item.get("html_url", str(item.get("id")))
        title = item.get("title") or ""
        # FIX: Ensure body is a string even if None, before slicing
        body = item.get("body") or "" 
        
        batched_text += f"\n--- ITEM {i} (ID: {uid}) ---\nTITLE: {title}\nBODY: {body[:1500]}\n"

    prompt = f"""
    You are a Knowledge Graph extractor. Analyze these {len(items)} GitHub items.
    
    For EACH item, extract:
    1. Entities: "Person", "Feature", "Bug", "Artifact", "Topic", "Decision".
    2. Relationships: How entities interact (e.g., "Reported", "Fixed", "Affects").
    
    CRITICAL: 
    - Use EXACT entity names from the text.
    - 'source' and 'target' in relationships must match Entity names exactly.
    - Provide a short 'text_excerpt' as evidence for every entity.

    Output a JSON LIST of objects:
    [
      {{
        "source_id": "ID_FROM_HEADER",
        "graph_data": {{
          "entities": [{{"name": "...", "type": "...", "text_excerpt": "..."}}],
          "relationships": [{{"source": "...", "target": "...", "relation_type": "..."}}]
        }}
      }}
    ]

    Data to process:
    {batched_text}
    """
    
    try:
        response = model.generate_content(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ API Error: {e}")
        return None

def process_corpus():
    raw_data, extracted_data = load_data()
    processed_ids = {item["source_id"] for item in extracted_data}
    remaining = [x for x in raw_data if x.get("html_url", str(x.get("id"))) not in processed_ids]

    print(f"🚀 Starting Extraction with gemini-flash-latest. Remaining items: {len(remaining)}")

    batch_size = 5
    for i in range(0, len(remaining), batch_size):
        batch = remaining[i : i + batch_size]
        print(f"📦 Processing batch {i//batch_size + 1} ({len(batch)} items)...")
        
        results = extract_batch(batch)
        if results:
            extracted_data.extend(results)
            save_progress(extracted_data)
        
        # 75s wait ensures we NEVER hit the quota window limit
        if i + batch_size < len(remaining):
            print("⏳ Cooldown 75s to reset API quota...")
            time.sleep(75)

    print("\n✅ Extraction Complete!")

if __name__ == "__main__":
    process_corpus()