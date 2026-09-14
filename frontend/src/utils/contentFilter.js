// Client-side display safety layer. Server remains authoritative.
const TERMS = [
  'sexual','sex','pornography','porn','porno','nude','nudes','sexy',
  'fuck','fucking','motherfucker','bitch','dick','pussy','cock','cum','cunt','asshole',
  'blowjob','handjob','horny','masturbat',
  'सेक्स','अश्लील','पोर्न','नंगा','नंगी','नग्न','సెక్స్','అశ్లీల','పోర్న్','నగ్న','போர்ன்','ஆபாச','செக்ஸ்',
  'ಸೆಕ್ಸ್','ಅಶ್ಲೀಲ','ಪೋರ್ನ್','നഗ്ന','സെക്സ്','അശ്ലീല','পর্ন','অশ্লীল','সেক্স','सेक्स','अश्लील',
  'સેક્સ','અશ્લીલ','ਪੋਰਨ','ਸੈਕਸ','سیکس','فحش','جنس','جنسي','إباحي','секс','порно','seks','sexo','pornografía','desnudo','sesso','nudo','nack','naakt'
]

function fold(value) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[\W_]+/gu, '')
}

export function maskUnsafeText(value) {
  if (typeof value !== 'string' || !value) return value
  let output = value
  const normalized = fold(value)
  let matched = false
  for (const term of [...TERMS].sort((a,b) => b.length - a.length)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (normalized.includes(fold(term))) {
      matched = true
      output = output.replace(new RegExp(escaped, 'giu'), (m) => '*'.repeat(Math.max(3, m.length)))
    }
  }
  if (matched && output === value) {
    // Covers separator/leet obfuscation that cannot be replaced by the literal term.
    output = value.replace(/\S+/gu, (token) => '*'.repeat(Math.max(3, Math.min(token.length, 20))))
  }
  return output
}
