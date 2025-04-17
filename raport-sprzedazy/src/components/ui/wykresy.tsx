// components/ui/wykresy.tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ReportItem } from '@/lib/generate-report'
import { useMemo } from 'react'

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#a28fd0', '#f6b26b'
]

type ChartItem = {
  date: string
  count: number
  netto: number
}

export default function Wykresy({
  report,
  chartData
}: {
  report: ReportItem[]
  chartData: ChartItem[]
}) {
  // 1. Sprzedaż wg dni (na podstawie chartData)
  const dataByDate = useMemo(() => {
    const map = new Map<string, { date: string; count: number; kwotaNetto: number }>()
    chartData.forEach((item) => {
      const key = item.date
      if (!key) return
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          count: item.count,
          kwotaNetto: item.netto
        })
      } else {
        const existing = map.get(key)!
        existing.count += item.count
        existing.kwotaNetto += item.netto
      }
    })
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [chartData])

  // 2. Top 10 produktów
  const topProducts = useMemo(() => {
    return [...report]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({ name: item.pozycja, count: item.count }))
  }, [report])

  // 3. Sprzedaż wg producenta
  const byProducer = useMemo(() => {
    const map = new Map<string, number>()
    report.forEach((item) => {
      const key = item.producent || 'Brak'
      map.set(key, (map.get(key) || 0) + item.count)
    })
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }, [report])

  // 4. Źródła sprzedaży
  const bySource = useMemo(() => {
    const map = new Map<string, number>()
    report.forEach((item) => {
      const key = item.pochodzenie || 'Brak'
      map.set(key, (map.get(key) || 0) + item.count)
    })
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }, [report])

  return (
    <div className="space-y-12">
  {/* Wykres 1 – sprzedaż dzienna */}
  <div>
    <h2 className="text-lg font-semibold mb-2">📅 Sprzedaż dzienna</h2>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dataByDate}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        
        {/* Dwie niezależne osie Y */}
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />

        <Tooltip />
        <Legend />

        {/* Ilość sztuk – lewa oś */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="count"
          stroke="#8884d8"
          name="Ilość sztuk"
        />

        {/* Kwota netto – prawa oś */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="kwotaNetto"
          stroke="#82ca9d"
          name="Kwota netto"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>


      {/* Wykres 2 – Top 10 produktów */}
      <div>
        <h2 className="text-lg font-semibold mb-2">🏆 Top 10 produktów</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topProducts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" name="Ilość" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wykres 3 – Producent */}
      <div>
        <h2 className="text-lg font-semibold mb-2">🏭 Sprzedaż wg producenta</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={byProducer}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {byProducer.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Wykres 4 – Źródło */}
      <div>
        <h2 className="text-lg font-semibold mb-2">🌍 Sprzedaż wg źródła</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={bySource}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label
            >
              {bySource.map((entry, index) => (
                <Cell key={`cell-source-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}