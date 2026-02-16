'use client'

import { Block } from '@/lib/types'

interface TableBlockProps {
  block: Block
}

export default function TableBlock({ block }: TableBlockProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <td className="px-4 py-2 bg-gray-50 dark:bg-gray-800">Table placeholder</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-gray-500 dark:text-gray-400 p-3">
        Table support coming soon - use basic blocks for now
      </p>
    </div>
  )
}

