import json
import os
from typing import List, Dict

# Load tools.json once at module startup
_KB_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base", "tools.json")

with open(_KB_PATH, "r") as f:
    _TOOLS_DB: List[Dict] = json.load(f)["tools"]


def retrieve_tools(keywords: List[str], task_type: str, top_k: int = 5) -> List[Dict]:
    """
    Match MCP tools from the knowledge base based on keywords and task type.
    Returns the top_k most relevant tools.
    """
    scored_tools: List[tuple] = []

    keywords_lower = [kw.lower() for kw in keywords]
    task_type_lower = task_type.lower().replace("_", " ")

    for tool in _TOOLS_DB:
        score = 0
        tool_use_cases = [uc.lower() for uc in tool["use_cases"]]
        tool_name_lower = tool["name"].lower()
        tool_category_lower = tool["category"].lower()
        tool_desc_lower = tool["description"].lower()

        for kw in keywords_lower:
            # Match against use cases
            for uc in tool_use_cases:
                if kw in uc or uc in kw:
                    score += 3

            # Match against name and category
            if kw in tool_name_lower:
                score += 2
            if kw in tool_category_lower:
                score += 1
            if kw in tool_desc_lower:
                score += 1

        # Bonus: task type match against category
        if task_type_lower in tool_category_lower or tool_category_lower in task_type_lower:
            score += 4

        if score > 0:
            scored_tools.append((score, tool))

    # Sort by score descending, take top_k
    scored_tools.sort(key=lambda x: x[0], reverse=True)
    return [tool for _, tool in scored_tools[:top_k]]


def format_tools_for_prompt(tools: List[Dict]) -> str:
    """Format retrieved tools into a readable string for the LLM prompt."""
    if not tools:
        return "No specific tools matched. Suggest general-purpose development tools."

    lines = []
    for tool in tools:
        lines.append(f"- {tool['name']} ({tool['category']}): {tool['description']}")
    return "\n".join(lines)
