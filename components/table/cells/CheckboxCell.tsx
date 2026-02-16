import { Check } from 'lucide-react'

interface CheckboxCellProps {
    value: boolean | null
    onChange: (value: boolean) => void
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
    return (
        <div
            className="w-full px-2 py-1.5 min-h-[32px] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={() => onChange(!value)}
        >
            <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer
                    ${value
                        ? 'bg-blue-500 border-blue-500 shadow-sm'
                        : 'border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
            >
                {value && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                )}
            </div>
        </div>
    )
}
