import { TableData, TableColumn, ColumnType } from '@/lib/types'
import { Type, Hash, Calendar, CheckSquare, Link, List, ListChecks } from 'lucide-react'

export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createDefaultTable(): TableData {
    return {
        columns: [
            { id: generateId(), name: 'Name', type: 'text', width: 200 },
            { id: generateId(), name: 'Type', type: 'select', width: 150, options: [] },
            { id: generateId(), name: 'Status', type: 'select', width: 150, options: [] },
        ],
        rows: [
            { id: generateId(), cells: {} },
            { id: generateId(), cells: {} },
            { id: generateId(), cells: {} },
        ],
    }
}

export function getColumnIcon(type: ColumnType) {
    switch (type) {
        case 'text':
            return Type
        case 'number':
            return Hash
        case 'date':
            return Calendar
        case 'checkbox':
            return CheckSquare
        case 'url':
            return Link
        case 'select':
            return List
        case 'multi-select':
            return ListChecks
        default:
            return Type
    }
}
