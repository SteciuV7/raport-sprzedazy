'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import DatePicker from 'react-datepicker'

type FiltersProps = {
  search: string
  setSearch: (value: string) => void
  selectedProducent: string
  setSelectedProducent: (value: string) => void
  selectedPochodzenie: string
  setSelectedPochodzenie: (value: string) => void
  sort: string
  setSort: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>
  excludeZwroty: boolean
  setExcludeZwroty: (value: boolean) => void
  excludeReklamacje: boolean
  setExcludeReklamacje: (value: boolean) => void
  producenci: string[]
  pochodzenie: string[]
  fromDate: Date | null
  toDate: Date | null
  setFromDate: (date: Date | null) => void
  setToDate: (date: Date | null) => void
}

export function Filters({
  search,
  setSearch,
  selectedProducent,
  setSelectedProducent,
  selectedPochodzenie,
  setSelectedPochodzenie,
  sort,
  setSort,
  excludeZwroty,
  setExcludeZwroty,
  excludeReklamacje,
  setExcludeReklamacje,
  producenci,
  pochodzenie,
  fromDate,
  toDate,
  setFromDate,
  setToDate
}: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 items-center">
      <Input
        placeholder="Szukaj produktu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <Select onValueChange={setSelectedProducent} value={selectedProducent}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtr Producent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Wszyscy</SelectItem>
          {producenci
            .filter((p) => p.trim() !== '')
            .map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select onValueChange={setSelectedPochodzenie} value={selectedPochodzenie}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtr Pochodzenie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Wszystkie</SelectItem>
          {pochodzenie
            .filter((p) => p.trim() !== '')
            .map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select onValueChange={(value) => setSort(value as 'asc' | 'desc')} value={sort}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sortuj" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Ilość malejąco</SelectItem>
          <SelectItem value="asc">Ilość rosnąco</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center space-x-2">
      <Switch
        checked={excludeZwroty}
        onChange={setExcludeZwroty}
       />
      <span className="ml-2">Wyklucz zwroty</span>
      </div>

      <div className="flex items-center space-x-2">
      <Switch
        checked={excludeReklamacje}
        onChange={setExcludeReklamacje}
        />
        <Label htmlFor="reklamacje">Wyklucz reklamacje</Label>
      </div>
      <div className="flex flex-col gap-2">
  <label className="text-sm font-medium">Zakres dat</label>
  <DatePicker
    selectsRange
    startDate={fromDate}
    endDate={toDate}
    onChange={(dates) => {
      const [start, end] = dates as [Date, Date]
      setFromDate(start)
      setToDate(end)
    }}
    isClearable
    dateFormat="dd.MM.yyyy"
    className="border px-3 py-2 rounded-md text-sm w-full"
  />
</div>
    </div>
  )
}
