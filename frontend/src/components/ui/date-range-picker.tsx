import * as React from "react"
import { addDays, format, startOfDay, endOfDay, subDays } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  presetPeriod?: string
  onPresetChange?: (preset: string) => void
}

const presetOptions = [
  {
    label: "Hoje",
    value: "1d",
    getDateRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date())
    })
  },
  {
    label: "Últimos 7 dias",
    value: "7d",
    getDateRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date())
    })
  },
  {
    label: "Últimos 30 dias",
    value: "30d",
    getDateRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date())
    })
  },
  {
    label: "Todo o tempo",
    value: "all",
    getDateRange: () => ({
      from: undefined,
      to: undefined
    })
  }
]

export function DateRangePicker({
  className,
  date,
  onDateChange,
  presetPeriod = "30d",
  onPresetChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date)
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>()

  // Get display text for current selection
  const getDisplayText = () => {
    const preset = presetOptions.find(p => p.value === presetPeriod)
    if (preset && preset.value !== "custom") {
      return preset.label
    }

    if (internalDate?.from) {
      if (internalDate.to) {
        return `${format(internalDate.from, "dd/MM/yyyy")} - ${format(internalDate.to, "dd/MM/yyyy")}`
      }
      return format(internalDate.from, "dd/MM/yyyy")
    }

    return "Selecionar período"
  }

  // Handle preset selection
  const handlePresetClick = (preset: typeof presetOptions[0]) => {
    const dateRange = preset.getDateRange()
    setInternalDate(dateRange)
    onDateChange?.(dateRange)
    onPresetChange?.(preset.value)
    setIsOpen(false)
  }

  // Handle custom date selection
  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    setInternalDate(selectedDate)

    // If both dates are selected, close the popover and update
    if (selectedDate?.from && selectedDate?.to) {
      onDateChange?.(selectedDate)
      onPresetChange?.("custom")
      setIsOpen(false)
    }
  }

  // Handle day hover for range preview
  const handleDayMouseEnter = (day: Date) => {
    if (internalDate?.from && !internalDate?.to) {
      setHoveredDate(day)
    }
  }

  const handleDayMouseLeave = () => {
    setHoveredDate(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal bg-glass backdrop-blur-xl border border-white/10 hover:bg-white/5 transition-all duration-300",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{getDisplayText()}</span>
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-background/95 backdrop-blur-xl border border-white/10"
          align="start"
        >
          <div className="flex flex-col lg:flex-row">
            {/* Preset Options */}
            <div className="border-b lg:border-b-0 lg:border-r border-white/10 p-3 lg:w-48">
              <div className="space-y-1">
                {presetOptions.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={presetPeriod === preset.value ? "default" : "ghost"}
                    className="w-full justify-start text-sm h-8"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={internalDate?.from}
                selected={internalDate}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                locale={ptBR}
                modifiers={{
                  hovered: hoveredDate ? (date) => {
                    if (!internalDate?.from || internalDate?.to) return false
                    const isInRange = internalDate.from <= date && date <= hoveredDate
                    const isInRangeReverse = hoveredDate <= date && date <= internalDate.from
                    return isInRange || isInRangeReverse
                  } : undefined
                }}
                modifiersStyles={{
                  hovered: {
                    backgroundColor: 'hsl(var(--accent))',
                    color: 'hsl(var(--accent-foreground))'
                  }
                }}
                onDayMouseEnter={handleDayMouseEnter}
                onDayMouseLeave={handleDayMouseLeave}
                className="pointer-events-auto"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
