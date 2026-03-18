import re
from typing import List, Dict


# Common stop words to filter out
STOP_WORDS = {
    "a", "an", "the", "is", "it", "in", "on", "at", "to", "for",
    "of", "and", "or", "but", "with", "that", "this", "how", "what",
    "can", "do", "i", "me", "my", "we", "you", "your", "need", "want",
    "build", "create", "make", "get", "help", "using", "use", "based",
    "like", "some", "which", "will", "be", "have", "has", "from", "by",
    "should", "would", "could", "about", "please", "into", "also", "then"
}

TASK_TYPE_PATTERNS: Dict[str, List[str]] = {
    "machine_learning": ["ml", "machine learning", "model", "train", "predict", "classification", "regression", "neural", "deep learning", "ai model"],
    "data_analysis": ["analyze", "analysis", "data", "statistics", "insights", "report", "dashboard", "metrics", "trend"],
    "web_development": ["website", "web app", "frontend", "backend", "react", "api", "REST", "fastapi", "flask", "django"],
    "data_collection": ["scrape", "crawl", "collect", "fetch", "extract", "dataset", "gather", "retrieve"],
    "nlp": ["text", "nlp", "natural language", "summarize", "sentiment", "chatbot", "language model", "embeddings"],
    "infrastructure": ["deploy", "docker", "kubernetes", "cloud", "server", "devops", "ci/cd", "pipeline", "infrastructure"],
    "database": ["database", "sql", "nosql", "query", "store", "postgres", "mongodb", "redis", "cache"],
    "automation": ["automate", "automation", "schedule", "task", "workflow", "background", "queue", "trigger"],
    "security": ["auth", "authentication", "authorization", "login", "jwt", "oauth", "security", "permission"],
    "visualization": ["chart", "graph", "plot", "visualize", "dashboard", "visual", "display", "ui"],
}


def extract_keywords(prompt: str) -> List[str]:
    """Extract meaningful keywords from the user prompt."""
    # Lowercase and remove punctuation
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", prompt.lower())
    words = cleaned.split()

    # Filter stop words and short tokens
    keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]

    # Also extract bigrams (two-word phrases)
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    keywords += bigrams

    return list(set(keywords))


def detect_task_type(prompt: str) -> str:
    """Detect the primary task type from the prompt."""
    prompt_lower = prompt.lower()
    scores: Dict[str, int] = {}

    for task_type, patterns in TASK_TYPE_PATTERNS.items():
        score = sum(1 for pattern in patterns if pattern in prompt_lower)
        if score > 0:
            scores[task_type] = score

    if not scores:
        return "general"

    return max(scores, key=lambda k: scores[k])
