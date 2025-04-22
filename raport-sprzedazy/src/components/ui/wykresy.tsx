"use client";

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
  Brush,
} from "recharts";
import { ReportItem } from "@/lib/generate-report";
import { useMemo } from "react";
import { useState } from "react";

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
  "#ffc0cb",
  "#a28fd0",
  "#f6b26b",
];

export type ChartItem = {
  date: string;
  count: number;
  kwotaBrutto: number;
  kwotaNetto: number;
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

export default function Wykresy({
  report,
  chartData,
  zwrotyData,
}: {
  report: ReportItem[];
  chartData: ChartItem[];
  zwrotyData: { month: string; product: string; count: number }[];
}) {
  // 1. Sprzedaż wg dni (na podstawie chartData)

  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [sortBy, setSortBy] = useState("count-desc");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const filteredZwroty = useMemo(() => {
    return zwrotyData
      .filter(
        (row) =>
          row.product.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (monthFilter ? row.month === monthFilter : true)
      )
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.product.localeCompare(b.product);
        if (sortBy === "name-desc") return b.product.localeCompare(a.product);
        if (sortBy === "count-asc") return a.count - b.count;
        if (sortBy === "count-desc") return b.count - a.count;
        return 0;
      });
  }, [zwrotyData, searchTerm, monthFilter, sortBy]);

  const paginatedData = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredZwroty.slice(start, start + itemsPerPage);
  }, [filteredZwroty, currentPage]);

  const totalPages = Math.ceil(filteredZwroty.length / itemsPerPage);

  const dataByDate = useMemo(() => {
    const map = new Map<
      string,
      { date: string; count: number; kwotaBrutto: number; kwotaNetto: number }
    >();
    chartData.forEach((item) => {
      const key = item.date;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          count: item.count,
          kwotaBrutto: item.kwotaBrutto,
          kwotaNetto: item.kwotaNetto,
        });
      } else {
        const existing = map.get(key)!;
        existing.count += item.count;
        existing.kwotaBrutto += item.kwotaBrutto;
        existing.kwotaNetto += item.kwotaNetto;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [chartData]);

  // 2.1 Konwersja do formatu wykresu: { product, [month1]: x, [month2]: y }
  const { processedZwrotyData, uniqueMonths } = useMemo(() => {
    const grouped = new Map<string, Record<string, any>>(); // Map<Produkt, { [month]: count }>
    zwrotyData.forEach(({ month, product, count }) => {
      if (!grouped.has(product)) grouped.set(product, { product });
      grouped.get(product)![month] = count;
    });
    const allMonths = Array.from(
      new Set(zwrotyData.map((z) => z.month))
    ).sort();
    const result = Array.from(grouped.values()).filter((row) =>
      allMonths.some((month) => (row[month] || 0) > 0)
    );

    return { processedZwrotyData: result, uniqueMonths: allMonths };
  }, [zwrotyData]);

  // 1.1 Sumy i średnie z przefiltrowanych danych
  const summary = useMemo(() => {
    const totalDays = dataByDate.length;
    const totalCount = dataByDate.reduce((sum, d) => sum + d.count, 0);
    const totalBrutto = dataByDate.reduce((sum, d) => sum + d.kwotaBrutto, 0);
    const totalNetto = dataByDate.reduce((sum, d) => sum + d.kwotaNetto, 0);

    return {
      totalCount,
      totalBrutto,
      totalNetto,
      avgCount: totalDays ? totalCount / totalDays : 0,
      avgBrutto: totalDays ? totalBrutto / totalDays : 0,
      avgNetto: totalDays ? totalNetto / totalDays : 0,
    };
  }, [dataByDate]);

  // 3. Sprzedaż wg producenta
  const byProducer = useMemo(() => {
    const map = new Map<string, number>();
    report.forEach((item) => {
      const key = item.producent || "Brak";
      map.set(key, (map.get(key) || 0) + item.count);
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]); // sort descending
    const topN = 10;

    const top = entries
      .slice(0, topN)
      .map(([name, count]) => ({ name, count }));
    const others = entries.slice(topN);
    const sumOthers = others.reduce((sum, [, count]) => sum + count, 0);

    if (sumOthers > 0) {
      top.push({ name: "Inni", count: sumOthers });
    }

    return top;
  }, [report]);

  // 4. Źródła sprzedaży
  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    report.forEach((item) => {
      const key = item.pochodzenie || "Brak";
      map.set(key, (map.get(key) || 0) + item.count);
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]); // posortuj malejąco

    const topN = 10;
    const top = entries
      .slice(0, topN)
      .map(([name, count]) => ({ name, count }));
    const others = entries.slice(topN);
    const sumOthers = others.reduce((sum, [, count]) => sum + count, 0);

    if (sumOthers > 0) {
      top.push({ name: "Inne", count: sumOthers });
    }

    return top;
  }, [report]);

  const renderCustomLegend = (
    items: { name: string; count: number }[],
    colors: string[]
  ) => {
    const total = items.reduce((sum, item) => sum + (item.count || 0), 0);

    return (
      <ul className="text-sm space-y-1">
        {items.map((entry, index) => {
          const percent = total
            ? ((entry.count / total) * 100).toFixed(1)
            : "0.0";

          return (
            <li key={index} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                {entry.name}: {entry.count} szt. ({percent}%)
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-12">
      {/* Wykres 1 – sprzedaż dzienna */}
      <div>
        <h2 className="text-lg font-semibold mb-2">📅 Sprzedaż dzienna</h2>

        <div className="flex flex-col items-center text-sm mb-2 text-gray-700">
          <p>
            📦 Suma: {summary.totalCount} sztuk | 💰 Brutto:{" "}
            {formatCurrency(summary.totalBrutto)} | 🧮 Netto:{" "}
            {formatCurrency(summary.totalNetto)}
          </p>
          <p>
            📊 Średnio dziennie: {summary.avgCount.toFixed(1)} szt. | Brutto:{" "}
            {formatCurrency(summary.avgBrutto)} | Netto:{" "}
            {formatCurrency(summary.avgNetto)}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={dataByDate}
            margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickMargin={10}
              minTickGap={10}
              interval="preserveStartEnd"
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />

            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === "Kwota brutto" || name === "Kwota netto") {
                  return [
                    `${Number(value).toLocaleString("pl-PL", {
                      minimumFractionDigits: 2,
                    })} EUR`,
                    name,
                  ];
                }
                return [value, name];
              }}
              labelFormatter={(label: string) => `📅 ${label}`}
            />
            <Legend />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              name="Ilość sztuk"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="kwotaBrutto"
              stroke="#FFA500"
              name="Kwota brutto"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="kwotaNetto"
              stroke="#82ca9d"
              name="Kwota netto"
            />

            <Brush
              dataKey="date"
              height={30}
              stroke="#8884d8"
              travellerWidth={10}
              startIndex={0}
              endIndex={dataByDate.length - 1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wykres 2 – Zwroty miesięczne wg produktów */}
      {/* Tabela zwrotów z wyszukiwarką, sortowaniem, filtrem i paginacją */}
      <div>
        <h2 className="text-lg font-semibold mb-2">
          ♻️ Zwroty miesięczne wg produktów
        </h2>

        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 text-sm">
          <input
            type="text"
            placeholder="🔍 Szukaj produktu..."
            className="border px-2 py-1 rounded w-full md:w-1/3"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border px-2 py-1 rounded w-full md:w-auto"
            onChange={(e) => setMonthFilter(e.target.value)}
            value={monthFilter}
          >
            <option value="">📅 Wszystkie miesiące</option>
            {uniqueMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select
            className="border px-2 py-1 rounded w-full md:w-auto"
            onChange={(e) => setSortBy(e.target.value)}
            value={sortBy}
          >
            <option value="name-asc">🔤 A-Z</option>
            <option value="name-desc">🔡 Z-A</option>
            <option value="count-desc">⬆️ Ilość malejąco</option>
            <option value="count-asc">⬇️ Ilość rosnąco</option>
          </select>
        </div>

        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">📦 Produkt</th>
                <th className="p-2 border text-right">🔁 Ilość zwrotów</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center p-4 text-gray-400">
                    Brak wyników.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 border">{row.product}</td>
                    <td className="p-2 border text-right">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacja */}
        <div className="flex justify-between items-center mt-4 text-sm">
          <div className="text-sm text-right mb-2">
            🔢 Suma zwrotów:{" "}
            {filteredZwroty.reduce((sum, row) => sum + row.count, 0)}
          </div>
          <span>
            Strona {currentPage + 1} z {totalPages}
          </span>
          <div className="space-x-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              ◀️ Poprzednia
            </button>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage >= totalPages - 1}
            >
              ▶️ Następna
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <h2 className="text-lg font-semibold mb-4">
          📊 Sprzedaż wg producenta i źródła
        </h2>

        <div className="flex flex-col lg:flex-row gap-12 w-full justify-between">
          {/* Wykres 1 – Producent */}
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2">🏭 Producent</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byProducer.map((item) => ({
                    ...item,
                    fullData: byProducer,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {byProducer.map((_, index) => (
                    <Cell
                      key={`cell-producer-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                {/* Tooltip z udziałem procentowym */}
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ width: "30%" }}
                  content={() => renderCustomLegend(byProducer, COLORS)}
                />

                {/* Legenda z ilością i procentem */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;

                    const item = payload[0] as any;
                    const fullData = item?.payload?.fullData || [];

                    const total = fullData.reduce(
                      (sum: number, p: { count: number }) =>
                        sum +
                        (typeof p.count === "number"
                          ? p.count
                          : Number(p.count) || 0),
                      0
                    );

                    const current =
                      typeof item?.value === "number"
                        ? item.value
                        : Number(item?.value) || 0;

                    const percent = total
                      ? ((current / total) * 100).toFixed(1)
                      : "0.0";

                    return (
                      <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow text-sm text-gray-800">
                        <div className="font-semibold">{item?.name}</div>
                        <div>{current} sztuk</div>
                        <div>{percent}% udziału</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Wykres 2 – Źródło */}
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2">🌍 Źródło</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bySource.map((item) => ({
                    ...item,
                    fullData: bySource,
                  }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {bySource.map((_, index) => (
                    <Cell
                      key={`cell-source-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                {/* Tooltip z udziałem procentowym */}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;

                    const item = payload[0] as any;
                    const fullData = item?.payload?.fullData || [];

                    const total = fullData.reduce(
                      (sum: number, p: { count: number }) =>
                        sum +
                        (typeof p.count === "number"
                          ? p.count
                          : Number(p.count) || 0),
                      0
                    );

                    const current =
                      typeof item?.value === "number"
                        ? item.value
                        : Number(item?.value) || 0;

                    const percent = total
                      ? ((current / total) * 100).toFixed(1)
                      : "0.0";

                    return (
                      <div className="bg-white border border-gray-300 rounded px-3 py-2 shadow text-sm text-gray-800">
                        <div className="font-semibold">{item?.name}</div>
                        <div>{current} sztuk</div>
                        <div>{percent}% udziału</div>
                      </div>
                    );
                  }}
                />

                {/* Legenda z ilością i procentem */}
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{
                    width: "50%",
                    paddingLeft: 0,
                    marginLeft: "-40px",
                  }}
                  content={() => renderCustomLegend(bySource, COLORS)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
