'use server'

import { parse } from 'csv-parse/sync'

export async function parseCsv(csvString: string) {
  try {
    // 1. Usuwamy wszystkie cudzysłowy z pliku
    const cleaned = csvString.replace(/"/g, '')

    // 2. Parsujemy dane bez columns
    const raw = parse(cleaned, {
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    })

    const header = raw[0]
    const rows = raw.slice(1)

    // 3. Filtrowanie tylko poprawnych wierszy
    const filtered = rows
      .filter((row: any[]) => row.length === header.length)
      .map((row: any[]) =>
        Object.fromEntries(header.map((key: string, i: number) => [key.trim(), row[i]?.trim() ?? '']))
      )

    return filtered
  } catch (error) {
    console.error('❌ Błąd podczas parsowania CSV:', error)
    return []
  }
}
