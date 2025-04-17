export type Record = {
  ['PRODUCENT:']: string
  ['POCHODZENIE:']: string
  ['POZYCJE:']: string
  ['KWOTA NETTO:']?: string
  ['UTWORZONO DATA:']?: string
}

export type ReportItem = {
  producent: string
  pochodzenie: string
  pozycja: string
  count: number
  kwotaNetto: number
  dataUtworzenia: string // ISO format, do filtrowania
}

export function generateReport(data: Record[]): ReportItem[] {
  const map = new Map<string, ReportItem>()

  data.forEach((item) => {
    const producent = item['PRODUCENT:']?.trim() || 'Brak'
    const pochodzenie = item['POCHODZENIE:']?.trim() || 'Brak'
    const pozycja = item['POZYCJE:']?.trim() || 'Nieznany'
    const kwotaNetto = parseFloat(item['KWOTA NETTO:']?.replace(',', '.') || '0')
    const dataUtworzenia = parseDate(item['UTWORZONO DATA:'])

    const key = `${producent}__${pochodzenie}__${pozycja}` // nie uwzględniamy daty w kluczu

    if (!map.has(key)) {
      map.set(key, {
        producent,
        pochodzenie,
        pozycja,
        count: 1,
        kwotaNetto,
        dataUtworzenia
      })
    } else {
      const existing = map.get(key)!
      existing.count++
      existing.kwotaNetto += kwotaNetto
    }
  })

  return Array.from(map.values())
}

// Pomocnicza funkcja do parsowania daty z formatu DD.MM.RRRR na ISO string
function parseDate(dateStr?: string): string {
  if (!dateStr) return ''
  const [day, month, year] = dateStr.trim().split('.')
  if (!day || !month || !year) return ''
  return `${year}-${month}-${day}`
}
