'use client'

import { Block } from '@/lib/types'

interface ImageBlockProps {
  block: Block
  onUpdate: (block: Block) => void
}

export default function ImageBlock({ block, onUpdate }: ImageBlockProps) {
  return (
    <div className="space-y-2">
      {block.imageUrl && (
        <img
          src={block.imageUrl}
          alt={block.imageCaption || 'Image'}
          className="max-w-full rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <input
        type="text"
        value={block.imageUrl || ''}
        onChange={(e) => onUpdate({ ...block, imageUrl: e.target.value })}
        placeholder="Enter image URL..."
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                   bg-transparent dark:text-gray-100 outline-none"
      />
      <input
        type="text"
        value={block.imageCaption || ''}
        onChange={(e) => onUpdate({ ...block, imageCaption: e.target.value })}
        placeholder="Image caption..."
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg
                   bg-transparent dark:text-gray-100 outline-none text-sm italic"
      />
    </div>
  )
}

