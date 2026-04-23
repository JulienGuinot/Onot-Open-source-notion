import type { Metadata, Viewport } from 'next'
import './globals.css'
import { WorkspaceProvider } from '@/providers/WorkspaceProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import PWARegistry from '@/components/PWARegistry'
import NetworkStatus from '@/components/NetworkStatus'
import "@excalidraw/excalidraw/index.css";

export const metadata: Metadata = {
    title: {
        default: 'Onot',
        template: '%s - Onot',
    },
    description: 'A powerful note-taking application with blocks and workspace management',
    applicationName: 'Onot',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Onot',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: [
            { url: '/icons/icon.svg', type: 'image/svg+xml' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.svg', type: 'image/svg+xml' },
        ],
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#18181b' },
    ],
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
                        <PWARegistry />
                        {children}
                        <NetworkStatus />
                    </WorkspaceProvider>
                </AuthProvider>
            </body>
        </html>
    )
}

