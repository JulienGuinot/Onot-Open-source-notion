export function PdfPreview({ url }: { url: string }) {
    return <iframe src={url} title="PDF" className="w-full h-[500px] rounded-t-xl border-0 bg-white" />
}