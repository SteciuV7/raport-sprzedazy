import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/parse-csv'

export async function POST(req: Request) {
  const body = await req.text()
  const parsed = await parseCsv(body)

  return NextResponse.json(parsed) // zamiast { data: parsed }
}
