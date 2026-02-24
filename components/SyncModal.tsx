import { RefreshCcw } from "lucide-react";

export interface SyncModalProps {
    onClose: () => void
    onSyncNow: () => void
}


export function SyncModal({ onClose, onSyncNow }: SyncModalProps) {
    return (
        <>
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}           // ← on passe directement la fonction
            />

            <div
                className="
          absolute right-2 top-full mt-1.5 w-32 
          bg-white dark:bg-[#252525]
          border border-gray-200 dark:border-gray-700 
          rounded-xl shadow-2xl z-50
          animate-in fade-in zoom-in-95 duration-100
        "
            >
                <button
                    onClick={() => {
                        onClose();     // ferme d'abord
                        onSyncNow();   // ensuite déconnexion
                    }}
                    className="
            w-full flex items-center gap-2.5 px-3 py-2 pb-3 
            rounded-b-xl text-sm text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20 
            transition-colors text-left
          "
                >
                    <RefreshCcw size={15} />
                    Sync now
                </button>
            </div >
        </>
    )
}