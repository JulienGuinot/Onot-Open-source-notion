'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine)
        update()
        window.addEventListener('online', update)
        window.addEventListener('offline', update)
        return () => {
            window.removeEventListener('online', update)
            window.removeEventListener('offline', update)
        }
    }, [])

    if (isOnline) return null

    return (
        <div className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 sm:bottom-6">
            <WifiOff size={16} />
            <span>Mode hors ligne. Les changements restent sur cet appareil.</span>
        </div>
    )
}
