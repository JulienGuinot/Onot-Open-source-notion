'use client'

import { useState, useRef } from 'react'
import { X, Camera, User } from 'lucide-react'
import { UserProfile } from '@/lib/types'

interface ProfileSetupModalProps {
    isOpen: boolean
    onComplete: (data: { first_name: string; last_name: string; avatar_url: string }) => Promise<void>
    profile?: UserProfile | null
}

const AVATAR_COLORS = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-cyan-400 to-sky-500',
]

export default function ProfileSetupModal({ isOpen, onComplete, profile }: ProfileSetupModalProps) {
    const [firstName, setFirstName] = useState(profile?.first_name ?? '')
    const [lastName, setLastName] = useState(profile?.last_name ?? '')
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?'
    const colorIdx = (firstName.length + lastName.length) % AVATAR_COLORS.length
    const gradientClass = AVATAR_COLORS[colorIdx]

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            setError('Image must be less than 2MB')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const dataUrl = reader.result as string
            setAvatarPreview(dataUrl)
            setAvatarUrl(dataUrl)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required')
            return
        }

        setLoading(true)
        setError(null)

        try {
            await onComplete({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                avatar_url: avatarUrl,
            })
        } catch {
            setError('Failed to save profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl
                            border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 pb-2 text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Complete your profile
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Let your collaborators know who you are
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative group"
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-800"
                                />
                            ) : (
                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClass}
                                                flex items-center justify-center text-white text-2xl font-bold
                                                ring-4 ring-gray-100 dark:ring-gray-800`}>
                                    {initials !== '?' ? initials : <User size={32} />}
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30
                                            flex items-center justify-center transition-colors">
                                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Click to upload a photo (optional)
                        </span>
                    </div>

                    {/* First name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            First name
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                            autoFocus
                            className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200
                                       dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100
                                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                                       transition-colors"
                        />
                    </div>

                    {/* Last name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Last name
                        </label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200
                                       dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100
                                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                                       transition-colors"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !firstName.trim() || !lastName.trim()}
                        className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600
                                   rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                   shadow-sm"
                    >
                        {loading ? 'Saving...' : 'Continue'}
                    </button>
                </form>
            </div>
        </div>
    )
}
