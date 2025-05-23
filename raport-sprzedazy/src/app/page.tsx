"use client";

import { useState, useMemo } from "react";
import { splitOrders } from "@/lib/split-orders";
import { generateReport, ReportItem } from "@/lib/generate-report";
import { Filters } from "@/components/filters";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Tabela } from "@/components/ui/tabela";
import { eachDayOfInterval, format, parse } from "date-fns";

// Lazy-load komponent wykresów tylko na froncie
const Wykresy = dynamic(() => import("@/components/ui/wykresy"), {
  ssr: false,
});

// Pomocnicza funkcja
function parseDate(dateStr?: string): string {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.trim().split(".");
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

function getVatRate(channel: string): number {
  const lower = channel.toLowerCase();
  if (lower.includes("otto")) return 0.19;
  if (lower.includes("amazon fr")) return 0.2;
  if (lower.includes("amazon be")) return 0.21;
  if (lower.includes("moeblo")) return 0.19;
  if (lower.includes("amazon de")) return 0.19;
  if (lower.includes("xxxlutz")) return 0.19;
  if (lower.includes("cdiscount")) return 0.2;
  if (lower.includes("conforama")) return 0.2;
  if (lower.includes("sofart")) return 0.23;
  if (lower.includes("bol")) return 0.21;
  if (lower.includes("manomano.de")) return 0.19;
  if (lower.includes("amazon nl")) return 0.21;
  if (lower.includes("kaufland")) return 0.19;
  if (lower.includes("hood")) return 0.19;
  return 0; // domyślnie brak VAT
}

function generateChartDataFromReport(data: ReportItem[]) {
  const map = new Map<string, { date: string; count: number; netto: number }>();

  data.forEach((item) => {
    const date = item.dataUtworzenia;
    const netto = item.kwotaNetto;

    if (!date) return;

    if (!map.has(date)) {
      map.set(date, { date, count: item.count, netto });
    } else {
      const current = map.get(date)!;
      current.count += item.count;
      current.netto += netto;
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function generateChartData(data: any[]) {
  const map = new Map<
    string,
    { date: string; count: number; kwotaBrutto: number; kwotaNetto: number }
  >();

  data.forEach((item) => {
    const rawDate = (item["UTWORZONO DATA:"] || "").trim();
    const rawBrutto = parseFloat(
      (item["WARTOŚĆ:"] || "0").toString().replace(/\s/g, "").replace(",", ".")
    );

    if (!rawDate || isNaN(rawBrutto)) return;

    const parsedDate = parse(rawDate, "dd.MM.yyyy", new Date());
    const key = format(parsedDate, "yyyy-MM-dd");

    const channel = (item["POCHODZENIE:"] || "").toString();
    const vat = getVatRate(channel);
    const netto = parseFloat((rawBrutto / (1 + vat)).toFixed(2));

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        count: 1,
        kwotaBrutto: parseFloat(rawBrutto.toFixed(2)),
        kwotaNetto: netto,
      });
    } else {
      const current = map.get(key)!;
      current.count += 1;
      current.kwotaBrutto = parseFloat(
        (current.kwotaBrutto + rawBrutto).toFixed(2)
      );
      current.kwotaNetto = parseFloat((current.kwotaNetto + netto).toFixed(2));
    }
  });

  const allDates = Array.from(map.keys()).sort();
  if (allDates.length === 0) return [];

  const min = new Date(allDates[0]);
  const max = new Date(allDates[allDates.length - 1]);
  const fullRange = eachDayOfInterval({ start: min, end: max });

  return fullRange.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return (
      map.get(key) ?? {
        date: key,
        count: 0,
        kwotaBrutto: 0,
        kwotaNetto: 0,
      }
    );
  });
}

export default function HomePage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [splittedData, setSplittedData] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [selectedProducent, setSelectedProducent] = useState("ALL");
  const [selectedPochodzenie, setSelectedPochodzenie] = useState("ALL");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [excludeReklamacje, setExcludeReklamacje] = useState(false);
  const [excludeZwroty, setExcludeZwroty] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [view, setView] = useState<"table" | "charts">("table");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const res = await fetch("/api/upload", {
      method: "POST",
      body: text,
    });

    const json = await res.json();
    const raw = Array.isArray(json) ? json : [];

    if (!Array.isArray(raw) || raw.length === 0) {
      console.error("❌ Nieprawidłowy format danych:", json);
      return;
    }

    const splitted = splitOrders(raw);

    // Znajdź zakres dat z danych
    const dates = splitted
      .map((item) => parseDate(item["UTWORZONO DATA:"]))
      .filter(Boolean)
      .map((d) => new Date(d + "T12:00:00"));

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    setFromDate(minDate);
    setToDate(maxDate);

    setRawData(raw);
    setSplittedData(splitted);
  };

  // 1. Filtrowanie danych po dacie
  const filteredSplitted = splittedData.filter((item) => {
    const dateStr = item["UTWORZONO DATA:"];
    if (!fromDate || !toDate || !dateStr) return true;

    try {
      const current = new Date(parseDate(dateStr) + "T12:00:00");
      const from = new Date(fromDate);
      const to = new Date(toDate);

      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      return current >= from && current <= to;
    } catch (err) {
      return true;
    }
  });

  // 2. Nowy hook do przygotowania danych dla wykresu dziennego
  const chartData = useMemo(() => {
    const arr: {
      date: string;
      pozycja: string;
      count: number;
      netto: number;
    }[] = [];
    filteredSplitted.forEach((item) => {
      const date = parseDate(item["UTWORZONO DATA:"]);
      if (!date) return;
      arr.push({
        date,
        pozycja: item["NAZWA:"] || "Brak",
        count: Number(item["ILOŚĆ:"]) || 0,
        netto: Number(item["WARTOŚĆ NETTO:"]) || 0,
      });
    });
    return arr;
  }, [filteredSplitted]);

  const zwrotyChartData = useMemo(() => {
    const isZwrot = (item: any) => {
      const check = (val: string | undefined) =>
        (val || "").toLowerCase().includes("zwrot");
      return (
        check(item["PRODUCENT:"]) ||
        check(item["POCHODZENIE:"]) ||
        check(item["POZYCJE:"]) ||
        check(item["KOMENTARZ:"])
      );
    };

    const zwrotyMap = new Map<
      string,
      { product: string; count: number; month: string }
    >();

    filteredSplitted.forEach((item) => {
      if (!isZwrot(item)) return;

      const dataStr = item["UTWORZONO DATA:"];
      if (!dataStr) return;
      const [dd, mm, yyyy] = dataStr.split(".");
      const monthKey = `${yyyy}-${mm}`;

      const komentarz = item["KOMENTARZ:"] || "";
      let nazwa = item["POZYCJE:"] || item["NAZWA:"] || "Brak";

      if (komentarz.toLowerCase().includes("zwrot")) {
        const match = komentarz.match(/ZWROT (.*?)\s*\/\s*/);
        if (match && match[1]) {
          nazwa = match[1].trim();
        }
      }

      const mapKey = `${nazwa}__${monthKey}`;
      if (!zwrotyMap.has(mapKey)) {
        zwrotyMap.set(mapKey, { product: nazwa, count: 1, month: monthKey });
      } else {
        zwrotyMap.get(mapKey)!.count += 1;
      }
    });

    return Array.from(zwrotyMap.values());
  }, [filteredSplitted]);

  const report = generateReport(filteredSplitted);

  const suspicious = report.filter(
    (item) => item.dataUtworzenia === "2025-02-02"
  );
  console.log("🧐 Pozycje z datą 2025-02-02:");
  suspicious
    .sort((a, b) => b.count - a.count)
    .forEach((item) => {
      console.log(
        `→ ${item.pozycja} | ${item.count} szt. | ${item.kwotaNetto.toFixed(
          2
        )} EUR`
      );
    });

  const filtered = report
    .filter((item) => item.pozycja.toLowerCase().includes(search.toLowerCase()))
    .filter(
      (item) =>
        selectedProducent === "ALL" || item.producent === selectedProducent
    )
    .filter(
      (item) =>
        selectedPochodzenie === "ALL" ||
        item.pochodzenie === selectedPochodzenie
    )
    .filter((item) =>
      excludeReklamacje
        ? !item.producent.toLowerCase().includes("reklamacja")
        : true
    )
    .filter((item) =>
      excludeZwroty ? !item.producent.toLowerCase().includes("zwrot") : true
    )
    .sort((a, b) => (sort === "desc" ? b.count - a.count : a.count - b.count));

  const groupedChartData = useMemo(() => {
    const filteredSplittedForChart = filteredSplitted
      .filter((item) => {
        const name = item["NAZWA:"] || item["POZYCJE:"] || "";
        return name.toLowerCase().includes(search.toLowerCase());
      })
      .filter(
        (item) =>
          selectedProducent === "ALL" ||
          item["PRODUCENT:"] === selectedProducent
      )
      .filter(
        (item) =>
          selectedPochodzenie === "ALL" ||
          item["POCHODZENIE:"] === selectedPochodzenie
      )
      .filter((item) =>
        excludeReklamacje
          ? !(
              (item["PRODUCENT:"] || "").toLowerCase().includes("reklamacja") ||
              (item["POCHODZENIE:"] || "")
                .toLowerCase()
                .includes("reklamacja") ||
              (item["POZYCJE:"] || "").toLowerCase().includes("reklamacja")
            )
          : true
      )
      .filter((item) =>
        excludeZwroty
          ? !(
              (item["PRODUCENT:"] || "").toLowerCase().includes("zwrot") ||
              (item["POCHODZENIE:"] || "").toLowerCase().includes("zwrot") ||
              (item["POZYCJE:"] || "").toLowerCase().includes("zwrot")
            )
          : true
      );

    return generateChartData(filteredSplittedForChart);
  }, [
    filteredSplitted,
    search,
    selectedProducent,
    selectedPochodzenie,
    excludeReklamacje,
    excludeZwroty,
  ]);

  const producenci = [...new Set(report.map((r) => r.producent))].sort();
  const pochodzenie = [...new Set(report.map((r) => r.pochodzenie))].sort();

  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  if (!authorized) {
    return (
      <main className="p-8">
        <Card className="p-6 max-w-md mx-auto">
          <h1 className="text-xl font-semibold mb-4">
            🔐 Wprowadź hasło dostępu
          </h1>
          <Input
            type="password"
            placeholder="Hasło"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="mb-4"
          />
          <Button
            onClick={() => {
              if (passwordInput === "JanArt123!@#") {
                setAuthorized(true);
              } else {
                alert("❌ Niepoprawne hasło");
              }
            }}
          >
            Zatwierdź
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-8">
      <Card className="p-4">
        <h1 className="text-2xl font-semibold mb-4">
          📊 Raport Sprzedaży – Upload CSV
        </h1>
        <CardContent className="flex flex-col gap-4">
          <Input type="file" accept=".csv" onChange={handleUpload} />

          <div className="flex gap-2">
            <Button
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              📄 Tabela
            </Button>
            <Button
              variant={view === "charts" ? "default" : "outline"}
              onClick={() => setView("charts")}
            >
              📊 Wykresy
            </Button>
          </div>

          <Filters
            search={search}
            setSearch={setSearch}
            selectedProducent={selectedProducent}
            setSelectedProducent={setSelectedProducent}
            selectedPochodzenie={selectedPochodzenie}
            setSelectedPochodzenie={setSelectedPochodzenie}
            sort={sort}
            setSort={setSort}
            producenci={producenci}
            pochodzenie={pochodzenie}
            excludeReklamacje={excludeReklamacje}
            setExcludeReklamacje={setExcludeReklamacje}
            excludeZwroty={excludeZwroty}
            setExcludeZwroty={setExcludeZwroty}
            fromDate={fromDate}
            toDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
          />

          {view === "table" ? (
            <Tabela report={filtered} />
          ) : (
            <Wykresy
              report={filtered}
              chartData={groupedChartData}
              zwrotyData={zwrotyChartData}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
