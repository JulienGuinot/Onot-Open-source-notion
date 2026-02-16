'use client'

import { Block } from '@/lib/types'

interface CalloutBlockProps {
  block: Block
  onUpdate: (block: Block) => void
}

export default function CalloutBlock({ block, onUpdate }: CalloutBlockProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <input
        type="text"
        value={block.calloutIcon || '💡'}
        onChange={(e) => onUpdate({ ...block, calloutIcon: e.target.value })}
        maxLength={2}
        className="w-8 h-8 text-center bg-transparent outline-none text-lg"
      />
      <textarea
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder="Add a note..."
        className="flex-1 outline-none bg-transparent text-gray-700 dark:text-gray-300 resize-none"
        rows={3}
      />
    </div>
  )
}

