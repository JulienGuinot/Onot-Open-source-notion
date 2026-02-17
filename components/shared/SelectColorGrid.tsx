import { SELECT_COLOR_OPTIONS } from '@/lib/constants'

interface SelectColorGridProps {
    selected: string
    onChange: (color: string) => void
    size?: 'sm' | 'md'
}

export function SelectColorGrid({ selected, onChange, size = 'md' }: SelectColorGridProps) {
    const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
    const gapClass = size === 'sm' ? 'gap-1.5' : 'gap-2'

    return (
        <div className={`grid grid-cols-5 ${gapClass} p-2`}>
            {SELECT_COLOR_OPTIONS.map((color) => (
                <button
                    key={color.value}
                    onClick={() => onChange(color.value)}
                    className={`${sizeClass} rounded-full transition-all hover:scale-110 ${selected === color.value
                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-zinc-800 scale-110'
                        : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300'
                        }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                />
            ))}
        </div>
    )
}
