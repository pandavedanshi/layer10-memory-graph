import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {TOKEN}"}

REPO_OWNER = "tiangolo"
REPO_NAME = "fastapi"

# 🚀 TARGET: Fetch 500 items to ensure ~500 nodes / 400 edges
TARGET_COUNT = 500
PER_PAGE = 100  # Max allowed by GitHub API per request

def fetch_issues_paginated():
    """Fetches issues/PRs recursively until TARGET_COUNT is met."""
    all_issues = []
    page = 1
    
    print(f"🚀 Starting ingestion from {REPO_OWNER}/{REPO_NAME}...")
    
    while len(all_issues) < TARGET_COUNT:
        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues"
        params = {
            "state": "all",       
            "per_page": PER_PAGE,
            "sort": "comments",  # Sorting by 'comments' gets the most active/connected issues
            "direction": "desc",
            "page": page
        }
        
        print(f"📡 Fetching Page {page} (Current Total: {len(all_issues)})...")
        response = requests.get(url, headers=HEADERS, params=params)
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code} - {response.text}")
            break

        batch = response.json()
        if not batch:
            break  # No more data available
            
        all_issues.extend(batch)
        page += 1
        
        # Respect GitHub API rate limits
        time.sleep(1)

    # Trim to exact target
    return all_issues[:TARGET_COUNT]

def save_data(data):
    os.makedirs("data", exist_ok=True)
    filepath = os.path.join("data", "raw_corpus.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    print(f"✅ Successfully saved {len(data)} items to {filepath}")

if __name__ == "__main__":
    data = fetch_issues_paginated()
    if data:
        save_data(data)