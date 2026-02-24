// ─── UserModal.tsx ────────────────────────────────────────────────
import { UserProfile } from "@/lib/types";
import UserAvatar, { getUserDisplayName } from "./UserAvatar";
import { LogOut } from "lucide-react";

interface UserModalProps {
    profile: UserProfile;
    onClose: () => void;           // ← le parent décide quoi faire quand on ferme
    onSignOut: () => void;         // ← séparé pour plus de clarté
}

export function UserModal({ profile, onClose, onSignOut }: UserModalProps) {
    return (
        <>
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}           // ← on passe directement la fonction
            />

            <div
                className="
          absolute right-0 top-full mt-1.5 w-64 
          bg-white dark:bg-[#252525]
          border border-gray-200 dark:border-gray-700 
          rounded-xl shadow-2xl z-50
          animate-in fade-in zoom-in-95 duration-100
        "
            >
                <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-2.5">
                        <UserAvatar
                            avatarUrl={profile?.avatar_url}
                            firstName={profile?.first_name}
                            lastName={profile?.last_name}
                            email={profile.email}
                            userId={profile.id}
                            size="lg"
                        />
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {getUserDisplayName(profile?.first_name, profile?.last_name, profile.email)}
                            </div>

                            {profile?.first_name && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                    {profile.email}
                                </div>
                            )}

                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                <span className="text-[10px] text-gray-400">Synced</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        onClose();     // ferme d'abord
                        onSignOut();   // ensuite déconnexion
                    }}
                    className="
            w-full flex items-center gap-2.5 px-3 py-2 pb-3 
            rounded-b-xl text-sm text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20 
            transition-colors text-left
          "
                >
                    <LogOut size={15} />
                    Sign out
                </button>
            </div >
        </>
    );
}