from pydantic import BaseModel, Field
from typing import List, Optional

# 1. Grounding: Every extracted fact must point to source evidence [cite: 39]
class Evidence(BaseModel):
    source_id: str = Field(..., description="The URL or ID of the comment/issue body")
    text_excerpt: str = Field(..., description="The exact quote from the text supporting this fact")

# 2. Entities: The core objects in our graph [cite: 38]
class Entity(BaseModel):
    name: str = Field(..., description="Unique name/ID of the entity (e.g., 'bug-fix-login', 'user123')")
    type: str = Field(..., description="Type of entity: 'Person', 'Feature', 'Bug', 'PullRequest', 'Technology'")
    description: str = Field(..., description="Brief summary of what this entity is")
    evidence: List[Evidence] = Field(default=[], description="Quotes proving this entity exists")

# 3. Relationships: How entities connect (The Edges)
class Relationship(BaseModel):
    source: str = Field(..., description="Name of the source entity")
    target: str = Field(..., description="Name of the target entity")
    relation_type: str = Field(..., description="e.g., 'AUTHORED', 'FIXES', 'MENTIONS', 'IS_RELATED_TO'")
    evidence: List[Evidence] = Field(default=[], description="Quotes proving this relationship exists")

# 4. The Container: What the LLM returns for each document
class ExtractionResult(BaseModel):
    entities: List[Entity]
    relationships: List[Relationship]