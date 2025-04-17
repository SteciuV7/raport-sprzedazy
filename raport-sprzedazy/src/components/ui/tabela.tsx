'use client'

import { ReportItem } from '@/lib/generate-report'

export function Tabela({ report }: { report: ReportItem[] }) {
  return (
    <div className="border rounded-md mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="text-left p-2">Producent</th>
            <th className="text-left p-2">Źródło</th>
            <th className="text-left p-2">Pozycja</th>
            <th className="text-right p-2">Ilość</th>
          </tr>
        </thead>
        <tbody>
          {report.map((item, idx) => (
            <tr key={idx} className="border-b">
              <td className="p-2">{item.producent}</td>
              <td className="p-2">{item.pochodzenie}</td>
              <td className="p-2">{item.pozycja}</td>
              <td className="p-2 text-right">{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
