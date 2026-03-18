import re
import random
from typing import Optional


# ─────────────────────────────────────────────
#  Pattern groups — order matters, specific first
# ─────────────────────────────────────────────

_PATTERNS = [

    # Greetings
    {
        "patterns": [
            r"^h+e+l+o+\s*[!.]*$",
            r"^h+i+\s*[!.]*$",
            r"^hey+\s*[!.]*$",
            r"^hiya\s*[!.]*$",
            r"^yo+\s*[!.]*$",
            r"^sup\s*[!.?]*$",
            r"^what'?s\s+up\s*[!.?]*$",
            r"^whats\s+up\s*[!.?]*$",
            r"^wassup\s*[!.?]*$",
            r"^wsp\s*[!.?]*$",
            r"^wuzz?up\s*[!.?]*$",
        ],
        "replies": [
            "Hey! What are we building today?",
            "Yo! Drop your idea — let's make it real.",
            "Hey there! Got something cooking? Let's hear it.",
            "What's good! Tell me what you're working on.",
            "Heyyy! Ready when you are — what's the plan?",
            "Hey! You showed up, so something's on your mind. What is it?",
        ],
    },

    # How are you
    {
        "patterns": [
            r"^how\s+are\s+you\s*[!.?]*$",
            r"^how\s+r\s+u\s*[!.?]*$",
            r"^how\s+are\s+u\s*[!.?]*$",
            r"^how\s+r\s+you\s*[!.?]*$",
            r"^hows?\s+it\s+going\s*[!.?]*$",
            r"^hows?\s+things\s*[!.?]*$",
            r"^you\s+good\s*[!.?]*$",
            r"^u\s+good\s*[!.?]*$",
            r"^all\s+good\s*[!.?]*$",
            r"^doing\s+good\s*[!.?]*$",
        ],
        "replies": [
            "Doing great — brain's warmed up and ready. What are you working on?",
            "Honestly? Excited to build something. What's on your mind?",
            "Good! Sitting here waiting for an interesting problem. Got one?",
            "Sharp and ready. You?",
            "Running smooth. What are we solving today?",
            "Pretty good! More importantly — what's your next idea?",
        ],
    },

    # Good morning / afternoon / evening / night
    {
        "patterns": [
            r"^good\s+morning\s*[!.]*$",
            r"^gm\s*[!.]*$",
            r"^good\s+afternoon\s*[!.]*$",
            r"^good\s+evening\s*[!.]*$",
            r"^good\s+night\s*[!.]*$",
            r"^gn\s*[!.]*$",
        ],
        "replies": [
            "Morning! Ready to turn ideas into code — what are we starting with?",
            "Good morning! Hope it's a productive one. What's the first thing on your list?",
            "Hey, good morning! Coffee in hand? Let's build something.",
            "Good evening! Great time to work on something — what's the project?",
            "Night! Before you go — anything you want to jot down for tomorrow?",
        ],
    },

    # Thanks / thank you
    {
        "patterns": [
            r"^thank(s|\s+you)\s*[!.]*$",
            r"^thx\s*[!.]*$",
            r"^ty\s*[!.]*$",
            r"^tysm\s*[!.]*$",
            r"^thank\s+u\s*[!.]*$",
            r"^cheers\s*[!.]*$",
            r"^appreciate\s+it\s*[!.]*$",
        ],
        "replies": [
            "Anytime! What's next?",
            "Of course! Fire away if you need anything else.",
            "Always. What are we tackling next?",
            "Glad it helped. Keep going — what's the next piece?",
            "No problem at all. What else?",
        ],
    },

    # Bye / see you / later
    {
        "patterns": [
            r"^bye\s*[!.]*$",
            r"^bye\s+bye\s*[!.]*$",
            r"^see\s+(you|ya|u)\s*[!.]*$",
            r"^later\s*[!.]*$",
            r"^cya\s*[!.]*$",
            r"^take\s+care\s*[!.]*$",
            r"^ttyl\s*[!.]*$",
            r"^gtg\s*[!.]*$",
        ],
        "replies": [
            "See you! Come back when the next idea hits.",
            "Later! Go build something great.",
            "Take care! I'll be right here when you need me.",
            "Catch you next time. Don't let that idea sit too long!",
            "Peace ✌️ Come back anytime.",
        ],
    },

    # OK / okay / cool / got it / nice / alright
    {
        "patterns": [
            r"^o+k+a?y?\s*[!.]*$",
            r"^o+k+\s*[!.]*$",
            r"^cool\s*[!.!]*$",
            r"^nice\s*[!.]*$",
            r"^got\s+it\s*[!.]*$",
            r"^got\s+u\s*[!.]*$",
            r"^alright\s*[!.]*$",
            r"^aight\s*[!.]*$",
            r"^sounds?\s+good\s*[!.]*$",
            r"^perfect\s*[!.]*$",
            r"^great\s*[!.]*$",
        ],
        "replies": [
            "Solid. What's next?",
            "Cool — keep going, what's the next piece?",
            "Got it. What else do you need?",
            "Perfect. What are we doing next?",
            "Nice! What's the next move?",
        ],
    },

    # Lol / haha / lmao / funny reactions
    {
        "patterns": [
            r"^lo+l+\s*[!.]*$",
            r"^ha(ha)+\s*[!.]*$",
            r"^lmao\s*[!.]*$",
            r"^lmfao\s*[!.]*$",
            r"^😂+$",
            r"^🤣+$",
            r"^xd\s*[!.]*$",
        ],
        "replies": [
            "Haha! Alright alright — back to it though, what are we building?",
            "😄 Good energy! Now, what's the plan?",
            "Lol okay okay — what were we doing?",
            "Ha! Alright, focus mode. What's next?",
        ],
    },

    # Who are you / what are you
    {
        "patterns": [
            r"^who\s+are\s+you\s*[!.?]*$",
            r"^what\s+are\s+you\s*[!.?]*$",
            r"^who\s+r\s+u\s*[!.?]*$",
            r"^are\s+you\s+an?\s+ai\s*[!.?]*$",
            r"^are\s+you\s+a\s+bot\s*[!.?]*$",
            r"^are\s+you\s+human\s*[!.?]*$",
        ],
        "replies": [
            "I'm your Prompt Intelligence Assistant — I take your rough ideas and turn them into sharp, actionable prompts with the right tools and the right expert mindset. Think of me as the co-pilot for whatever you're building.",
            "Part engineer, part prompt architect. I help you go from 'I have an idea' to 'here's exactly how to build it.' What are you working on?",
            "I'm the thing between your idea and a great prompt. Drop your task and I'll show you what I mean.",
            "Not a bot, not a template — I actually think through what you're trying to do and give you something useful back. Try me.",
        ],
    },

    # What can you do / help
    {
        "patterns": [
            r"^what\s+can\s+you\s+do\s*[!.?]*$",
            r"^how\s+can\s+you\s+help\s*[!.?]*$",
            r"^help\s*[!.?]*$",
            r"^help\s+me\s*[!.?]*$",
            r"^what\s+do\s+you\s+do\s*[!.?]*$",
        ],
        "replies": [
            "Give me any task or idea — I'll rewrite it into a sharp prompt, tell you what kind of expert should tackle it, and suggest the exact tools you'd need. Try something like: 'build a fraud detection system' or 'scrape product data and visualize it'.",
            "Three things: I optimize your prompt so it's actually useful, I generate the right expert persona for the job, and I suggest the MCP tools that fit. Just describe what you want to build.",
            "You give me a rough idea. I give you back a clear prompt, the right mindset, and a tool stack. That's the deal. What are you building?",
        ],
    },

    # Test / testing / hello world
    {
        "patterns": [
            r"^test\s*[!.?]*$",
            r"^testing\s*[!.?]*$",
            r"^hello\s+world\s*[!.?]*$",
            r"^ping\s*[!.?]*$",
        ],
        "replies": [
            "Loud and clear! Send me a real prompt when you're ready.",
            "All systems go. Drop your idea whenever.",
            "Pong! I'm here — what are we building?",
            "Working! Now give me something interesting to chew on.",
        ],
    },

]


def detect_casual(prompt: str) -> Optional[str]:
    """
    Check if the prompt is casual/greeting.
    Returns a soulful reply string if matched, None if it should go to AI.
    """
    text = prompt.strip().lower()

    # Remove trailing punctuation noise for matching
    text_clean = re.sub(r"[!?.,'\"]+$", "", text).strip()

    for group in _PATTERNS:
        for pattern in group["patterns"]:
            if re.match(pattern, text_clean, re.IGNORECASE):
                return random.choice(group["replies"])

    return None  # Not casual — let AI handle it
