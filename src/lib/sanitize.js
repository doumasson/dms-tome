// Prompt injection patterns to strip from user input
const INJECTION_PATTERNS = [
  // GPT / Llama tokens
  /<\|system\|>/gi, /<\|user\|>/gi, /<\|assistant\|>/gi, /<\|endoftext\|>/gi,
  /\[INST\]/gi, /\[\/INST\]/gi, /<<SYS>>/gi, /<\/SYS>>/gi,
  // Claude legacy format
  /\n\nHuman:/g, /\n\nAssistant:/g,
  // Claude Messages API XML
  /<\/?instructions>/gi, /<\/?system>/gi, /<\/?human>/gi, /<\/?assistant>/gi,
]

const MAX_INPUT_LENGTH = 4000

/**
 * Sanitize user input before sending to Claude API.
 * Strips prompt injection patterns and caps length.
 */
export function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, '')
  }
  // Strip null bytes
  clean = clean.replace(/\0/g, '')
  // Cap length
  if (clean.length > MAX_INPUT_LENGTH) {
    clean = clean.slice(0, MAX_INPUT_LENGTH)
  }
  return clean.trim()
}

// HTML tags that are dangerous in rendered output
const DANGEROUS_HTML = /<\s*(script|iframe|object|embed|form|meta|link|base|svg\s+on|img\s+[^>]*onerror)[^>]*>/gi

/**
 * Sanitize AI response before rendering in the UI.
 * Strips dangerous HTML and javascript: URLs.
 */
export function sanitizeOutput(text) {
  if (!text || typeof text !== 'string') return ''
  let clean = text
  // Strip dangerous HTML tags
  clean = clean.replace(DANGEROUS_HTML, '')
  // Strip javascript: URLs in markdown links
  clean = clean.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '$1')
  return clean
}
