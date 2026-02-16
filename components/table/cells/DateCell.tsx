import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { CellPortal } from '../CellPortal'

interface DateCellProps {
    value: string | null
    onChange: (value: string | null) => void
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

export function DateCell({ value, onChange }: DateCellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const d = new Date(value)
            return { month: d.getMonth(), year: d.getFullYear() }
        }
        const now = new Date()
        return { month: now.getMonth(), year: now.getFullYear() }
    })
    const triggerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value) {
            const d = new Date(value)
            setViewDate({ month: d.getMonth(), year: d.getFullYear() })
        }
    }, [value])

    const selectedDate = useMemo(() => {
        if (!value) return null
        return new Date(value)
    }, [value])

    const formatDisplayDate = useCallback((dateStr: string | null) => {
        if (!dateStr) return null
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })
        } catch {
            return dateStr
        }
    }, [])

    const getDaysInMonth = useCallback((month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate()
    }, [])

    const getFirstDayOfMonth = useCallback((month: number, year: number) => {
        return new Date(year, month, 1).getDay()
    }, [])

    const calendarDays = useMemo(() => {
        const days: (number | null)[] = []
        const daysInMonth = getDaysInMonth(viewDate.month, viewDate.year)
        const firstDay = getFirstDayOfMonth(viewDate.month, viewDate.year)

        // Add empty slots for days before the first day
        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }

        // Add the days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days
    }, [viewDate, getDaysInMonth, getFirstDayOfMonth])

    const handlePrevMonth = () => {
        setViewDate(prev => {
            if (prev.month === 0) {
                return { month: 11, year: prev.year - 1 }
            }
            return { month: prev.month - 1, year: prev.year }
        })
    }

    const handleNextMonth = () => {
        setViewDate(prev => {
            if (prev.month === 11) {
                return { month: 0, year: prev.year + 1 }
            }
            return { month: prev.month + 1, year: prev.year }
        })
    }

    const handleSelectDay = (day: number) => {
        const date = new Date(viewDate.year, viewDate.month, day)
        const isoDate = date.toISOString().split('T')[0] || ''
        onChange(isoDate)
        setIsOpen(false)
    }

    const handleClear = () => {
        onChange(null)
        setIsOpen(false)
    }

    const handleToday = () => {
        const today = new Date()
        const isoDate = today.toISOString().split('T')[0] || ''
        onChange(isoDate)
        setIsOpen(false)
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() &&
            viewDate.month === today.getMonth() &&
            viewDate.year === today.getFullYear()
    }

    const isSelected = (day: number) => {
        if (!selectedDate) return false
        return day === selectedDate.getDate() &&
            viewDate.month === selectedDate.getMonth() &&
            viewDate.year === selectedDate.getFullYear()
    }

    return (
        <div className="relative w-full h-full">
            <div
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-2 py-1.5 min-h-[32px] text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                {value ? (
                    <span className="dark:text-gray-200 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDisplayDate(value)}
                    </span>
                ) : (
                    <span className="text-gray-400 flex items-center gap-2">
                        <Calendar size={14} />
                        Pick a date
                    </span>
                )}
            </div>

            {isOpen && (
                <CellPortal
                    triggerRef={triggerRef}
                    onClose={() => setIsOpen(false)}
                    minWidth={280}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Header with month/year navigation */}
                        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-gray-500" />
                            </button>
                            <div className="text-sm font-medium dark:text-gray-200">
                                {MONTHS[viewDate.month]} {viewDate.year}
                            </div>
                            <button
                                onClick={handleNextMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Calendar grid */}
                        <div className="p-3">
                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DAYS.map(day => (
                                    <div
                                        key={day}
                                        className="text-center text-xs font-medium text-gray-400 py-1"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, index) => (
                                    <div key={index} className="aspect-square">
                                        {day !== null && (
                                            <button
                                                onClick={() => handleSelectDay(day)}
                                                className={`w-full h-full flex items-center justify-center text-sm rounded-lg transition-all
                                                    ${isSelected(day)
                                                        ? 'bg-blue-500 text-white font-medium'
                                                        : isToday(day)
                                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <button
                                onClick={handleToday}
                                className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                Today
                            </button>
                            {value && (
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X size={14} />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </CellPortal>
            )}
        </div>
    )
}
