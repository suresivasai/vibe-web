# backend/app/services/moderation.py
# Purpose: multilingual sexual/profanity masking + report-based auto-ban

from datetime import datetime, timedelta, timezone
import re
import unicodedata
from uuid import UUID

from better_profanity import profanity
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Report, User

profanity.load_censor_words()

# A practical local safety layer. This is intentionally configurable rather than
# claiming to cover every language on Earth. Unicode normalization + punctuation
# folding also catches common obfuscation such as "s.e.x" / "s-e-x".
MULTILINGUAL_SEXUAL_TERMS = {
    # English
    "sex", "sexual", "sexy", "porn", "porno", "pornography", "nude", "nudes",
    # Hindi / Hinglish (Devanagari + common Latin transliterations)
    "सेक्स", "अश्लील", "पोर्न", "नंगा", "नंगी", "नग्न", "sex kar", "ch***", "bc",
    # Telugu
    "సెక్స్", "అశ్లీల", "పోర్న్", "నగ్న", "బూతు",
    # Tamil
    "செக்ஸ்", "ஆபாச", "போர்ன்", "நிர்வாண",
    # Kannada
    "ಸೆಕ್ಸ್", "ಅಶ್ಲೀಲ", "ಪೋರ್ನ್", "ನಗ್ನ",
    # Malayalam
    "സെക്സ്", "അശ്ലീല", "പോൺ", "നഗ്ന",
    # Bengali
    "সেক্স", "অশ্লীল", "পর্ন", "নগ্ন",
    # Marathi
    "सेक्स", "अश्लील", "पोर्न", "नग्न",
    # Gujarati
    "સેક્સ", "અશ્લીલ", "પોર્ન", "નગ્ન",
    # Punjabi / Gurmukhi
    "ਸੈਕਸ", "ਅਸ਼ਲੀਲ", "ਪੋਰਨ", "ਨੰਗਾ", "ਨੰਗੀ",
    # Urdu
    "سیکس", "فحش", "پورن", "برہنہ",
    # Arabic
    "جنس", "جنسي", "إباحي", "اباحي", "عاري", "عري",
    # Spanish / Portuguese / French / Italian
    "sexo", "sexual", "porno", "pornografía", "desnudo", "desnuda",
    "sexo", "pornografia", "nu", "nua", "nue", "nudité", "pornographie",
    "sesso", "porno", "nudo", "nuda",
    # German / Dutch
    "sex", "porno", "pornografie", "nackt", "naakt",
    # Russian / Turkish
    "секс", "порно", "порнография", "голый", "голая",
    "seks", "porno", "çıplak", "ciplak",
}

# Keep the explicit dictionary modest; better_profanity remains a second layer.
# These patterns target common sexual/slur obfuscation without trying to block all
# ordinary words containing short substrings.
COMPACT_TERMS = {
    "fuck", "fucking", "motherfucker", "bitch", "dick", "pussy", "cock",
    "cum", "cunt", "asshole", "blowjob", "handjob", "horny", "masturbat",
}


def _normalize_for_match(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    # Leet-ish substitutions; deliberately conservative.
    text = text.translate(str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"}))
    # Remove separators commonly used to evade filters while preserving scripts.
    text = re.sub(r"[\W_]+", "", text, flags=re.UNICODE)
    return text


def _term_is_present(content: str, term: str) -> bool:
    folded_content = _normalize_for_match(content)
    folded_term = _normalize_for_match(term)
    return bool(folded_term) and folded_term in folded_content


def _masked_copy(content: str, terms: list[str]) -> str:
    result = content
    # Apply longer terms first so short terms do not partially mask a longer one.
    for term in sorted(terms, key=len, reverse=True):
        if not term.strip():
            continue
        escaped = re.escape(term)
        result = re.sub(escaped, lambda m: "*" * max(3, len(m.group(0))), result, flags=re.IGNORECASE)
    return result


def filter_message(content: str) -> tuple[str, bool]:
    """Mask detected profanity/sexual language while preserving the rest of the message."""
    if not content:
        return "", False

    flagged = profanity.contains_profanity(content)
    matched_terms: list[str] = []
    for term in MULTILINGUAL_SEXUAL_TERMS | COMPACT_TERMS:
        if _term_is_present(content, term):
            matched_terms.append(term)
            flagged = True

    if not flagged:
        return content, False

    # Mask direct spellings first. For obfuscated forms, fall back to masking the
    # whole token/word rather than exposing the original sexual content.
    masked = _masked_copy(content, matched_terms)
    if masked == content:
        masked = re.sub(r"\S+", lambda m: "*" * min(max(len(m.group(0)), 3), 20), content)
    return masked, True


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
