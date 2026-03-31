/**
 * Simple CSV parser — no external dependencies.
 * Handles quoted fields, escaped quotes, Windows/Unix line endings.
 */

export interface ParseResult {
  headers: string[]
  rows: string[][]
}

export function parseCSV(text: string): ParseResult {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n").filter(l => l.trim() !== "")

  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const next = line[i + 1]

      if (inQuotes) {
        if (char === '"' && next === '"') {
          // Escaped quote inside a quoted field
          current += '"'
          i++ // skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ",") {
          fields.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
    }

    fields.push(current.trim())
    return fields
  }

  const firstRow = parseRow(lines[0])

  // Determine if first row is a header by checking if it contains non-numeric values
  // that look like column names
  const isHeader = firstRow.some(field => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(field) && !/^\+?\d[\d\s\-\(\)]{6,}$/.test(field))

  let headers: string[]
  let dataLines: string[]

  if (isHeader) {
    headers = firstRow.map(h => h.toLowerCase().replace(/\s+/g, "_"))
    dataLines = lines.slice(1)
  } else {
    // No header — generate generic names
    headers = firstRow.map((_, i) => `col${i}`)
    dataLines = lines
  }

  const rows = dataLines
    .filter(l => l.trim() !== "")
    .map(parseRow)
    .filter(row => row.some(cell => cell.trim() !== ""))

  return { headers, rows }
}

/**
 * Normalize a phone number to international format (digits only, no + prefix).
 * Handles Argentine format and international format.
 * Returns null if the number cannot be parsed.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null

  // Remove everything except digits and leading +
  let phone = raw.replace(/[\s\-\(\)\.]/g, "")

  // Remove leading +
  if (phone.startsWith("+")) phone = phone.slice(1)

  // Must have at least 7 digits
  if (!/^\d{7,}$/.test(phone)) return null

  // Argentine local format: 0 + area code + number (possibly with 15 for mobile)
  if (phone.startsWith("0") && phone.length >= 9) {
    // Remove leading 0 and handle 15 mobile prefix
    // e.g. 011 15 1234-5678 → 5491112345678
    //      011 1234-5678    → 5491112345678
    let local = phone.slice(1) // remove leading 0
    // Remove 15 from mobile prefix (after area code)
    // Common Argentine area codes: 11 (2 digits), 221, 341... (3 digits)
    local = local.replace(/^(\d{2,4}?)15(\d{6,8})$/, "$1$2")
    phone = "549" + local
  }

  // Validate reasonable length (7 to 15 digits per ITU-T E.164)
  if (phone.length < 7 || phone.length > 15) return null

  return phone
}
