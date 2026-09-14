// Focused client-side safety layer. The backend is authoritative.
// Only explicit sexual/sexualized terms are masked; ordinary words and GIF URLs
// are left alone.
const TERMS = [
  'sex', 'sexual', 'sexy', 'porn', 'porno', 'pornography', 'nude', 'nudes',
  'fuck', 'fucking', 'motherfucker', 'dick', 'pussy', 'cock', 'cum', 'cunt',
  'blowjob', 'handjob', 'horny', 'masturbat',
  'सेक्स','अश्लील','पोर्न','नंगा','नंगी','नग्न',
  'సెక్స్','అశ్లీల','పోర్న్','నగ్న','బూతు',
  'செக்ஸ்','ஆபாச','போர்ன்','நிர்வாண',
  'ಸೆಕ್ಸ್','ಅಶ್ಲೀಲ','ಪೋರ್ನ್','ನಗ್ನ',
  'സെക്സ്','അശ്ലീല','പോൺ','നഗ്ന',
  'সেক্স','অশ্লীল','পর্ন','নগ্ন',
  'સેક્સ','અશ્લીલ','પોર્ન','નગ્ન',
  'ਸੈਕਸ','ਅਸ਼ਲੀਲ','ਪੋਰਨ','ਨੰਗਾ','ਨੰਗੀ',
  'سیکس','فحش','پورن','برہنہ',
  'جنس','جنسي','إباحي','اباحي','عاري','عري',
  'sexo','pornografía','desnudo','desnuda','pornografia',
  'sesso','nudo','nuda','pornographie','nackt','naakt',
  'секс','порно','порнография','голый','голая','seks','porno','çıplak','ciplak',
]

function fold(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[0-9]/g, (c) => ({0:'o',1:'i',3:'e',4:'a',5:'s',7:'t'}[c] || c))
    .replace(/[\p{P}\p{S}\p{Z}\p{N}_]+/gu, '')
}

export function maskUnsafeText(value) {
  if (typeof value !== 'string' || !value) return value
  if (/^https?:\/\/\S+$/i.test(value.trim())) return value

  const normalized = fold(value)
  const terms = [...TERMS].sort((a, b) => b.length - a.length)
  const matched = terms.filter((term) => normalized.includes(fold(term)))
  if (!matched.length) return value

  let output = value
  for (const term of matched) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    output = output.replace(new RegExp(escaped, 'giu'), (m) => '*'.repeat(Math.max(3, m.length)))
  }

  // If the word was obfuscated with separators, mask only that token instead
  // of wiping the entire message.
  if (output === value) {
    return value.split(/(\s+)/u).map((part) => {
      return matched.some((term) => fold(part).includes(fold(term)))
        ? '*'.repeat(Math.max(3, Math.min(part.length, 20)))
        : part
    }).join('')
  }
  return output
}
