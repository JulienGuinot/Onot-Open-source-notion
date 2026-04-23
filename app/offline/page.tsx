import Link from 'next/link'

export default function OfflinePage() {
    return (
        <main className="flex min-h-dvh items-center justify-center bg-white px-6 text-gray-900 dark:bg-zinc-900 dark:text-gray-100">
            <section className="w-full max-w-md text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
                    O
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Onot est hors ligne</h1>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    La derniere version ouverte de l'app reste disponible. Vos notes locales sont conservees sur cet appareil.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    Revenir aux notes
                </Link>
            </section>
        </main>
    )
}
