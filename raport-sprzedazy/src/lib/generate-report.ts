const sourceGroups: { [key: string]: string } = {
  "Amazon DE": "Amazon DE",
  "Amazon FR": "Amazon FR",
  "Amazon NL": "Amazon NL",
  "Amazon BE": "Amazon BE",
  "Apilo - Amazon": "Amazon (pozostałe)",
  "Apilo - Amazon, Amazon DE": "Amazon DE",
  "Apilo - Amazon, Amazon FR": "Amazon FR",
  "Apilo - Amazon, Amazon NL": "Amazon NL",
  "Apilo - Amazon, Amazon BE": "Amazon BE",
  "Apilo - Allegro": "Allegro",
  "Apilo - Allegro, Allegro - sofart": "Allegro",
  "Allegro - sofart": "Allegro",
  "Apilo - Erli": "Erli.pl",
  "Apilo - Erli, erli - SOFART": "Erli.pl",
  "Apilo - Kaufland": "Kaufland",
  "Apilo - Kaufland, Kaufland": "Kaufland",
  "Apilo - Prestashop, MOEBLO.de - sklep": "moeblo.de",
  "Apilo - Prestashop, Sofart.pl - sklep": "sofart.pl",
  Bol: "Bol.com",
  Hood: "Hood.de",
  Kaufland: "Kaufland",
  "MOEBLO.de - sklep": "moeblo.de",
  "Sofart.pl - sklep": "sofart.pl",
  "erli - SOFART": "Erli.pl",
  Otto: "Otto.de",
};

export type Record = {
  ["PRODUCENT:"]: string;
  ["POCHODZENIE:"]: string;
  ["POZYCJE:"]: string;
  ["KWOTA NETTO:"]?: string;
  ["UTWORZONO DATA:"]?: string;
  ["ID ZEWNĘTRZNE:"]?: string;
};

export type ReportItem = {
  producent: string;
  pochodzenie: string;
  pozycja: string;
  count: number;
  kwotaNetto: number;
  dataUtworzenia: string; // ISO format, do filtrowania
};

function detectManualSource(idZewnetrzne: string): string {
  const val = idZewnetrzne.toLowerCase();

  if (val.includes("xxxlutz")) return "XXXLutz";
  if (val.includes("cdiscount")) return "Cdiscount";
  if (val.includes("conforama")) return "Conforama";
  if (val.includes("manomano")) return "ManoMano.de";
  if (val.includes("kaufland")) return "Kaufland";

  return "Manual"; // domyślnie
}

export function generateReport(data: Record[]): ReportItem[] {
  const map = new Map<string, ReportItem>();

  data.forEach((item) => {
    const producent = item["PRODUCENT:"]?.trim() || "Brak";

    const pochodzenieRaw = item["POCHODZENIE:"]?.trim() || "Brak";
    let pochodzenie = sourceGroups[pochodzenieRaw] || pochodzenieRaw;
    if (pochodzenieRaw === "Manual") {
      const idZewnetrzne = item["ID ZEWNĘTRZNE:"] || "";
      pochodzenie = detectManualSource(idZewnetrzne);
    }

    const pozycja = item["POZYCJE:"]?.trim() || "Nieznany";
    const kwotaNetto = parseFloat(
      item["KWOTA NETTO:"]?.replace(",", ".") || "0"
    );
    const dataUtworzenia = parseDate(item["UTWORZONO DATA:"]);

    const key = `${producent}__${pochodzenie}__${pozycja}`; // nie uwzględniamy daty w kluczu

    if (!map.has(key)) {
      map.set(key, {
        producent,
        pochodzenie,
        pozycja,
        count: 1,
        kwotaNetto,
        dataUtworzenia,
      });
    } else {
      const existing = map.get(key)!;
      existing.count++;
      existing.kwotaNetto += kwotaNetto;
    }
  });

  return Array.from(map.values());
}

// Pomocnicza funkcja do parsowania daty z formatu DD.MM.RRRR na ISO string
function parseDate(dateStr?: string): string {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.trim().split(".");
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}
