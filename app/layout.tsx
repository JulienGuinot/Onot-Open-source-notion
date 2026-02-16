import type { Metadata } from 'next'
import './globals.css'
import { WorkspaceProvider } from '@/providers/WorkspaceProvider'
import { AuthProvider } from '@/providers/AuthProvider'

export const metadata: Metadata = {
    title: 'Onot - Note Taking App',
    description: 'A powerful note-taking application with blocks and workspace management',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>

            <body>
                <AuthProvider>
                    <WorkspaceProvider>
                        {children}
                    </WorkspaceProvider>
                </AuthProvider>
            </body>
        </html>
    )
}

