"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  placeholder?: string
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  placeholder = "Filtrar por data..."
}: DatePickerWithRangeProps) {
  const isMobile = useIsMobile()

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "min-w-0 max-w-full justify-start text-left font-normal bg-background px-3 h-8 text-xs",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
            <span className="truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd LLL, y", { locale: ptBR })} -{" "}
                    {format(date.to, "dd LLL, y", { locale: ptBR })}
                  </>
                ) : (
                  format(date.from, "dd LLL, y", { locale: ptBR })
                )
              ) : (
                placeholder
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={isMobile ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
      {date?.from && (
         <Button 
           variant="ghost" 
           size="icon" 
           className="h-8 w-8 shrink-0 rounded-full" 
           onClick={() => setDate(undefined)}
           title="Limpar Data"
         >
           <X className="h-4 w-4" />
         </Button>
      )}
    </div>
  )
}
