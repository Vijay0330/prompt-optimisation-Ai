"""
Knowledge Base Seeder — Phase 5 RAG
─────────────────────────────────────
Seeds the ChromaDB knowledge_base collection with:
  - All 20 MCP tool descriptions from tools.json
  - AI/ML concept definitions
  - Prompt engineering best practices
  - Common domain knowledge for the assistant

Called once at FastAPI startup — safe to call multiple times (upsert).
"""

import json
import os
from pathlib import Path
from typing import List, Dict

from services.embedder import embed_texts
from services.vector_store import add_documents, get_collection_count

_KB_PATH = Path(__file__).parent.parent / "knowledge_base" / "tools.json"


# ── Additional domain knowledge chunks ───────────────────────────────────────
DOMAIN_KNOWLEDGE = [
    # Prompt Engineering
    {
        "id": "pk_prompt_001",
        "text": "Prompt engineering is the practice of crafting effective inputs for AI language models. Best practices include: being specific and clear, providing context and examples, specifying the output format, breaking complex tasks into steps, and using role-based prompting such as 'You are an expert in...'.",
        "source": "PIA Knowledge Base",
        "category": "Prompt Engineering",
    },
    {
        "id": "pk_prompt_002",
        "text": "Chain-of-thought (CoT) prompting encourages AI models to reason step by step before giving a final answer. Adding phrases like 'Let's think step by step' or 'Walk me through your reasoning' significantly improves accuracy on complex tasks especially math, logic, and multi-step problems.",
        "source": "PIA Knowledge Base",
        "category": "Prompt Engineering",
    },
    {
        "id": "pk_prompt_003",
        "text": "Few-shot prompting involves providing 2-5 examples of the desired input-output format before the actual question. This helps the model understand the pattern and format you expect. Zero-shot works for simple tasks; few-shot is better for structured outputs, classification, or specific formatting.",
        "source": "PIA Knowledge Base",
        "category": "Prompt Engineering",
    },
    {
        "id": "pk_prompt_004",
        "text": "RAG (Retrieval-Augmented Generation) reduces hallucination by retrieving relevant documents and injecting them as context before the model generates an answer. The model is instructed to answer only from the provided context, making responses grounded in facts rather than parametric memory.",
        "source": "PIA Knowledge Base",
        "category": "AI Architecture",
    },
    # AI/ML Concepts
    {
        "id": "pk_ml_001",
        "text": "Fine-tuning is the process of continuing to train a pre-trained language model on a smaller, task-specific dataset. Supervised Fine-Tuning (SFT) uses labeled examples. RLHF (Reinforcement Learning from Human Feedback) further aligns the model with human preferences using reward models.",
        "source": "PIA Knowledge Base",
        "category": "Machine Learning",
    },
    {
        "id": "pk_ml_002",
        "text": "Embeddings are dense numerical vector representations of text that capture semantic meaning. Similar texts have similar vectors. Common embedding models include text-embedding-004 (Google, 768-dim), all-MiniLM-L6-v2 (384-dim, local), and text-embedding-3-small (OpenAI). Used in semantic search and RAG systems.",
        "source": "PIA Knowledge Base",
        "category": "Machine Learning",
    },
    {
        "id": "pk_ml_003",
        "text": "Vector databases store and index embedding vectors for fast similarity search. ChromaDB is free and embedded. Qdrant and Weaviate are production-grade. Pinecone is cloud-managed. FAISS is in-memory only. Cosine similarity and dot product are common distance metrics.",
        "source": "PIA Knowledge Base",
        "category": "AI Infrastructure",
    },
    {
        "id": "pk_ml_004",
        "text": "Hallucination in LLMs refers to confident but factually incorrect outputs. Common causes: training data gaps, ambiguous prompts, or models extrapolating beyond their knowledge. Mitigation: RAG (retrieval augmentation), chain-of-thought prompting, temperature reduction, and fact-checking prompts.",
        "source": "PIA Knowledge Base",
        "category": "AI Safety",
    },
    {
        "id": "pk_ml_005",
        "text": "Temperature controls randomness in LLM outputs. Temperature 0 produces deterministic, focused outputs (best for factual tasks). Temperature 0.7-1.0 produces more creative, varied outputs (good for brainstorming). Temperature above 1.0 produces very random, sometimes incoherent text.",
        "source": "PIA Knowledge Base",
        "category": "Machine Learning",
    },
    # Software Architecture
    {
        "id": "pk_arch_001",
        "text": "Microservices architecture splits an application into small, independently deployable services that communicate via APIs. Benefits: independent scaling, technology flexibility, fault isolation. Drawbacks: network latency, operational complexity. Use Docker and Kubernetes for orchestration.",
        "source": "PIA Knowledge Base",
        "category": "Software Architecture",
    },
    {
        "id": "pk_arch_002",
        "text": "FastAPI is a modern Python web framework for building APIs. Key features: automatic OpenAPI docs, async support with asyncio, Pydantic data validation, dependency injection. Faster than Flask. Use uvicorn as the ASGI server. Excellent for ML model serving and data APIs.",
        "source": "PIA Knowledge Base",
        "category": "Backend Development",
    },
    {
        "id": "pk_arch_003",
        "text": "MongoDB is a NoSQL document database ideal for flexible schemas and JSON-like documents. Motor is the async Python driver for MongoDB. Key concepts: collections, documents, indexes, aggregation pipeline. Ideal for storing AI conversation history, user data, and unstructured content.",
        "source": "PIA Knowledge Base",
        "category": "Database",
    },
    # Data Science
    {
        "id": "pk_ds_001",
        "text": "The data science pipeline typically includes: data collection, cleaning/preprocessing, exploratory data analysis (EDA), feature engineering, model selection, training, evaluation, and deployment. Python libraries: pandas (data manipulation), numpy (arrays), sklearn (ML), matplotlib/seaborn (visualization).",
        "source": "PIA Knowledge Base",
        "category": "Data Science",
    },
    {
        "id": "pk_ds_002",
        "text": "Web scraping collects data from websites programmatically. Python tools: requests + BeautifulSoup (static HTML), Selenium or Playwright (JavaScript-rendered sites), Scrapy (full framework). Always respect robots.txt, add request delays, and check the site's terms of service.",
        "source": "PIA Knowledge Base",
        "category": "Data Collection",
    },
    # Security
    {
        "id": "pk_sec_001",
        "text": "JWT (JSON Web Tokens) are compact, self-contained tokens for authentication. Structure: header.payload.signature. The server signs the token; clients store it (localStorage or httpOnly cookie). Stateless — no server-side session needed. Best practice: short expiry (15min-7days) + refresh tokens.",
        "source": "PIA Knowledge Base",
        "category": "Security",
    },
]


async def seed_knowledge_base():
    """
    Embed and store all knowledge base documents in ChromaDB.
    Safe to call multiple times — uses upsert so no duplicates.
    """
    print("[KBSeeder] Starting knowledge base seeding...")

    # ── Load MCP tools ─────────────────────────────────────────────────────────
    with open(_KB_PATH, "r") as f:
        tools_data = json.load(f)

    tool_chunks: List[Dict] = []
    for tool in tools_data["tools"]:
        use_cases_str = ", ".join(tool.get("use_cases", []))
        text = (
            f"MCP Tool: {tool['name']} — Category: {tool['category']}. "
            f"Description: {tool['description']} "
            f"Use cases: {use_cases_str}."
        )
        tool_chunks.append({
            "id":       f"tool_{tool['name'].replace(' ', '_').lower()}",
            "text":     text,
            "source":   "MCP Tool Registry",
            "category": tool["category"],
        })

    # ── Combine all knowledge chunks ───────────────────────────────────────────
    all_chunks = tool_chunks + DOMAIN_KNOWLEDGE

    # ── Embed all texts in one batch ───────────────────────────────────────────
    texts = [c["text"] for c in all_chunks]
    print(f"[KBSeeder] Embedding {len(texts)} knowledge chunks...")
    embeddings = await embed_texts(texts)

    # ── Upsert into ChromaDB ───────────────────────────────────────────────────
    doc_ids   = [c["id"] for c in all_chunks]
    metadatas = [
        {
            "source":   c.get("source", "PIA Knowledge Base"),
            "category": c.get("category", "General"),
            "type":     "knowledge_base",
        }
        for c in all_chunks
    ]

    add_documents("knowledge_base", doc_ids, embeddings, texts, metadatas)
    count = get_collection_count("knowledge_base")
    print(f"[KBSeeder] ✅ Knowledge base ready — {count} documents indexed.")
