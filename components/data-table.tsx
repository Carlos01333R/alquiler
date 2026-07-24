"use client"

import React from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useState, useMemo } from "react"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  options?: FilterOption[]
  placeholder?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchKey?: string | string[]
  searchPlaceholder?: string
  onRowClick?: (item: T) => void
  pageSize?: number
  filters?: FilterConfig[]
}

const ALL_VALUE = "__all__"

function formatLabel(value: string): string {
  if (!value) return value
  const withSpaces = value.replace(/_/g, " ")
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Buscar...",
  onRowClick,
  pageSize = 10,
  filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})


  const resolvedFilters = useMemo(() => {
    if (!filters || filters.length === 0) return []
    return filters.map((f) => {
      if (f.options && f.options.length > 0) return f
      const unique = Array.from(
        new Set(
          data
            .map((item) => item[f.key])
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        )
      ).sort()
      return {
        ...f,
        options: unique.map((v) => ({ value: v, label: formatLabel(v) })),
      }
    })
  }, [filters, data])

  const hasActiveFilters = Object.values(filterValues).some(
    (v) => v && v !== ALL_VALUE
  )

  const filtered = useMemo(() => {
    let result = data

    if (search && searchKey) {
      const keys = Array.isArray(searchKey) ? searchKey : [searchKey]
      const query = search.toLowerCase()
      result = result.filter((item) =>
        keys.some((key) => {
          const val = item[key]
          if (typeof val === "string") {
            return val.toLowerCase().includes(query)
          }
          if (typeof val === "number") {
            return String(val).includes(query)
          }
          return false
        })
      )
    }

    if (resolvedFilters.length > 0) {
      result = result.filter((item) =>
        resolvedFilters.every((f) => {
          const selected = filterValues[f.key]
          if (!selected || selected === ALL_VALUE) return true
          return item[f.key] === selected
        })
      )
    }

    return result
  }, [data, search, searchKey, resolvedFilters, filterValues])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilterValues({})
    setPage(0)
  }

  return (
    <div className="space-y-4 md:max-w-6xl overflow-auto">
      <div className="flex flex-wrap items-end gap-3">
        {searchKey && (
          <div className="relative max-w-sm flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="pl-9"
            />
          </div>
        )}

        {resolvedFilters.map((f) => (
          <div key={f.key} className="min-w-40">
            <Select
              value={filterValues[f.key] ?? ALL_VALUE}
              onValueChange={(v) => handleFilterChange(f.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.placeholder ?? f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos: {f.label}</SelectItem>
                {f.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item, i) => (
                <TableRow
                  key={(item.id as string) || i}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(item)
                        : (item[col.key] as React.ReactNode) ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} registro(s) encontrado(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}