# backend/app/services/moderation.py
# Purpose: focused sexual-content masking + report-based auto-ban

from datetime import datetime, timedelta, timezone
import re
import unicodedata
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Report, User

# Focus only on clearly sexual/explicit content. Do not use a broad profanity
# dictionary here: broad dictionaries can flag ordinary chat, names, or URLs.
SEXUAL_TERMS = {
    # English
    "sex", "sexual", "sexy", "porn", "porno", "pornography", "nude", "nudes",
    "fuck", "fucking", "motherfucker", "dick", "pussy", "cock", "cum", "cunt",
    "blowjob", "handjob", "horny", "masturbat",
    # Hindi / Indian-language terms
    "सेक्स", "अश्लील", "पोर्न", "नंगा", "नंगी", "नग्न",
    "సెక్స్", "అశ్లీల", "పోర్న్", "నగ్న", "బూతు",
    "செக்ஸ்", "ஆபாச", "போர்ன்", "நிர்வாண",
    "ಸೆಕ್ಸ್", "ಅಶ್ಲೀಲ", "ಪೋರ್ನ್", "ನಗ್ನ",
    "സെക്സ്", "അശ്ലീല", "പോൺ", "നഗ്ന",
    "সেক্স", "অশ্লীল", "পর্ন", "নগ্ন",
    "सेक्स", "अश्लील", "पोर्न", "नग्न",
    "સેક્સ", "અશ્લીલ", "પોર્ન", "નગ્ન",
    "ਸੈਕਸ", "ਅਸ਼ਲੀਲ", "ਪੋਰਨ", "ਨੰਗਾ", "ਨੰਗੀ",
    "سیکس", "فحش", "پورن", "برہنہ",
    "جنس", "جنسي", "إباحي", "اباحي", "عاري", "عري",
    # European-language basics
    "sexo", "pornografía", "desnudo", "desnuda", "pornografia",
    "sesso", "nudo", "nuda", "pornographie", "nackt", "naakt",
    "секс", "порно", "порнография", "голый", "голая", "seks", "porno", "çıplak", "ciplak",
}

# Terms whose normalized representation is safe to match after punctuation/leet
# folding. Avoid very short/ambiguous terms that can occur inside normal words.
COMPACT_TERMS = {
    "sex", "sexual", "sexy", "porn", "porno", "pornography", "nude", "nudes",
    "fuck", "fucking", "motherfucker", "dick", "pussy", "cock", "cum", "cunt",
    "blowjob", "handjob", "horny", "masturbat",
}


def _normalize_for_match(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = text.translate(str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"}))
    return re.sub(r"[\W_]+", "", text, flags=re.UNICODE)


def _term_is_present(content: str, term: str) -> bool:
    # For Latin terms, use a normalized-word test to avoid matching normal text
    # merely because a short sequence appears inside a larger unrelated word.
    folded_content = _normalize_for_match(content)
    folded_term = _normalize_for_match(term)
    return bool(folded_term) and folded_term in folded_content


def _mask_direct_occurrences(content: str, terms: list[str]) -> str:
    result = content
    for term in sorted(terms, key=len, reverse=True):
        if not term.strip():
            continue
        result = re.sub(re.escape(term), lambda m: "*" * max(3, len(m.group(0))), result, flags=re.IGNORECASE)
    return result


def filter_message(content: str) -> tuple[str, bool]:
    """Mask only detected sexual/explicit language; preserve ordinary content."""
    if not content:
        return "", False

    # A plain URL should be preserved verbatim; opaque media URLs are not words.
    stripped = content.strip()
    if re.fullmatch(r"https?://\S+", stripped, flags=re.IGNORECASE):
        return content, False

    matched_terms = [term for term in SEXUAL_TERMS | COMPACT_TERMS if _term_is_present(content, term)]
    if not matched_terms:
        return content, False

    masked = _mask_direct_occurrences(content, matched_terms)
    if masked != content:
        return masked, True

    # Obfuscation path: mask only the token containing the normalized term
    # (e.g. "s.e.x" -> "*****"), leaving surrounding text untouched.
    normalized_terms = {_normalize_for_match(term) for term in matched_terms if _normalize_for_match(term)}
    parts = re.split(r"(\s+)", content)
    changed = False
    for i, part in enumerate(parts):
        if not part or part.isspace():
            continue
        folded = _normalize_for_match(part)
        if folded and any(term in folded for term in normalized_terms):
            parts[i] = "*" * max(3, min(len(part), 20))
            changed = True
    return ("".join(parts), True) if changed else (content, False)


async def check_and_ban(db: AsyncSession, reported_user_id: UUID) -> dict:
    result = await db.execute(select(User).where(User.id == reported_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return {"action": "none"}

    user.report_count = (user.report_count or 0) + 1
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    count_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.reported_id == reported_user_id,
            Report.created_at >= since,
        )
    )
    recent_count = count_result.scalar() or 0

    action = "none"
    if user.report_count >= 10:
        user.is_banned = True
        user.ban_until = None
        action = "permanent_ban"
    elif recent_count >= 3:
        user.is_banned = True
        user.ban_until = datetime.now(timezone.utc) + timedelta(hours=24)
        action = "temp_ban_24h"

    await db.flush()
    return {
        "action": action,
        "report_count": user.report_count,
        "recent_count": recent_count,
        "ban_until": user.ban_until.isoformat() if user.ban_until else None,
    }
