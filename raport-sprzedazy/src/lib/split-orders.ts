export function splitOrders(data: any[]) {
  const result: any[] = []

  data.forEach((item) => {
    const pozycje = item['POZYCJE:']
      ?.split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p) || []

    // Jeśli tylko jeden produkt – zwróć oryginał
    if (pozycje.length === 1) {
      result.push(item)
      return
    }

    const producenci = item['PRODUCENT:']?.includes(',')
      ? item['PRODUCENT:'].split(',').map((p: string) => p.trim())
      : Array(pozycje.length).fill(item['PRODUCENT:'])

    const pochodzenia = item['POCHODZENIE:']?.includes(',')
      ? item['POCHODZENIE:'].split(',').map((p: string) => p.trim())
      : Array(pozycje.length).fill(item['POCHODZENIE:'])

      for (let i = 0; i < pozycje.length; i++) {
        result.push({
          ...item,
          'PRODUCENT:': producenci[i] || producenci[0] || '',
          'POCHODZENIE:': pochodzenia[i] || pochodzenia[0] || '',
          'POZYCJE:': pozycje[i],
          'UTWORZONO DATA:': item['UTWORZONO DATA:'] || '',
          'WARTOŚĆ:': i === 0 ? item['WARTOŚĆ:'] : '0' // 💥 tylko pierwsza pozycja dostaje kwotę
        })
      }
      
  })

  return result
}
