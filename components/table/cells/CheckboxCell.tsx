interface CheckboxCellProps {
    value: boolean | null
    onChange: (value: boolean) => void
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
    return (
        <div className="w-full px-2 py-1 flex items-center justify-center">
            <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
            />
        </div>
    )
}
