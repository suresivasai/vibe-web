# backend/app/middleware/sanitize.py
# Purpose: Server-side text sanitization for all user-generated content

import re
import unicodedata


def sanitize_text(text: str, max_length: int = 500) -> str:
    """
    Clean user-supplied text before storage or broadcast.

    - Strips HTML tags
    - Removes control characters (except common whitespace)
    - Normalizes Unicode (NFKC)
    - Collapses excessive whitespace
    - Truncates to max_length
    - Returns plain text only
    """
    if not text or not isinstance(text, str):
        return ""

    cleaned = unicodedata.normalize("NFKC", text)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = "".join(
        ch for ch in cleaned if unicodedata.category(ch)[0] != "C" or ch in "\n\r\t"
    )
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = cleaned.strip()

    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip()

    return cleaned


def sanitize_display_name(name: str) -> str:
    """
    Display names: letters, numbers, spaces, and limited punctuation.
    Min effective length enforced by schema. Max 24 chars.
    """
    if not name or not isinstance(name, str):
        return ""

    cleaned = unicodedata.normalize("NFKC", name)
    # Allow letters, numbers, spaces, and a few safe characters for creative names
    cleaned = "".join(c for c in cleaned if c.isalnum() or c.isspace() or c in "._'-")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:24]
