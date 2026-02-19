"use client";

import { useCallback, useRef, useState } from "react";
import supabase from "@/lib/supabase";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export type UploadResult = {
    bucket: string;
    path: string;
    fullPath?: string;
    publicUrl?: string;
    signedUrl?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
};

export type UseSupabaseUploadOptions = {
    bucket: string;
    folder?: string;
    upsert?: boolean;
    cacheControl?: string;
    createSignedUrl?: boolean;
    signedUrlTTL?: number;
    maxSizeMB?: number;
    allowedMimeTypes?: string[];
    buildPath?: (args: {
        userId: string;
        file: File;
        folder?: string;
        uuid: string;
    }) => string;
};

const MIME_EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
    "application/gzip": "gz",
    "application/json": "json",
    "application/xml": "xml",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/html": "html",
    "text/css": "css",
    "text/javascript": "js",
    "text/markdown": "md",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "font/woff": "woff",
    "font/woff2": "woff2",
    "font/ttf": "ttf",
    "font/otf": "otf",
};

function extFromNameOrType(file: File): string {
    const fromName = file.name.split(".").pop();
    if (fromName && fromName !== file.name) return fromName.toLowerCase();
    return MIME_EXT_MAP[file.type] ?? "bin";
}

function safeFolder(folder?: string): string {
    if (!folder) return "";
    return folder
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/\.\./g, "");
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export { formatFileSize };

export function useSupabaseUpload(opts: UseSupabaseUploadOptions) {
    const abortRef = useRef<AbortController | null>(null);

    const [status, setStatus] = useState<UploadStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<UploadResult | null>(null);
    const [progress, setProgress] = useState(0);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setStatus("idle");
        setError(null);
        setResult(null);
        setProgress(0);
    }, []);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setStatus("idle");
        setError("Upload cancelled");
        setProgress(0);
    }, []);

    const validate = useCallback(
        (file: File): string | null => {
            if (opts.maxSizeMB && file.size > opts.maxSizeMB * 1024 * 1024) {
                return `File too large (max ${opts.maxSizeMB} MB)`;
            }
            if (
                opts.allowedMimeTypes &&
                opts.allowedMimeTypes.length > 0 &&
                !opts.allowedMimeTypes.some((t) =>
                    t.endsWith("/*")
                        ? file.type.startsWith(t.replace("/*", "/"))
                        : file.type === t
                )
            ) {
                return `File type "${file.type || "unknown"}" is not allowed`;
            }
            return null;
        },
        [opts.maxSizeMB, opts.allowedMimeTypes]
    );

    const getPublicUrl = useCallback(
        (path: string): string => {
            if (!supabase) return "";
            const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
            return data.publicUrl;
        },
        [opts.bucket]
    );

    const refreshSignedUrl = useCallback(
        async (path: string) => {
            if (!supabase) throw new Error("Supabase not configured");
            const ttl = opts.signedUrlTTL ?? 3600;
            const { data, error } = await supabase.storage
                .from(opts.bucket)
                .createSignedUrl(path, ttl);

            if (error) throw error;
            return data.signedUrl;
        },
        [opts.bucket, opts.signedUrlTTL]
    );

    const remove = useCallback(
        async (paths: string[]) => {
            if (!supabase) throw new Error("Supabase not configured");
            const { error } = await supabase.storage.from(opts.bucket).remove(paths);
            if (error) throw error;
            if (result && paths.includes(result.path)) setResult(null);
        },
        [opts.bucket, result]
    );

    const upload = useCallback(
        async (file: File) => {
            if (!supabase) throw new Error("Supabase not configured");

            const validationError = validate(file);
            if (validationError) {
                setStatus("error");
                setError(validationError);
                throw new Error(validationError);
            }

            setStatus("uploading");
            setError(null);
            setResult(null);
            setProgress(0);

            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const { data: auth, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                const userId = auth.user?.id;
                if (!userId) throw new Error("Not authenticated");

                setProgress(10);

                const uuid = crypto.randomUUID();
                const folder = safeFolder(opts.folder);
                const ext = extFromNameOrType(file);

                const relative =
                    opts.buildPath?.({ userId, file, folder, uuid }) ??
                    `${folder ? `${folder}/` : ""}${uuid}.${ext}`;

                const path = `${userId}/${relative}`;

                setProgress(20);

                const { data, error } = await supabase.storage
                    .from(opts.bucket)
                    .upload(path, file, {
                        upsert: opts.upsert ?? false,
                        cacheControl: opts.cacheControl ?? "3600",
                        contentType: file.type || "application/octet-stream",
                    });

                if (error) throw error;

                setProgress(80);

                const finalPath = data.path ?? path;

                const res: UploadResult = {
                    bucket: opts.bucket,
                    path: finalPath,
                    fullPath: (data as any).fullPath,
                    publicUrl: getPublicUrl(finalPath),
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type || "application/octet-stream",
                };

                if (opts.createSignedUrl) {
                    res.signedUrl = await refreshSignedUrl(res.path);
                }

                setProgress(100);
                setResult(res);
                setStatus("success");
                return res;
            } catch (e: any) {
                if (e?.name === "AbortError") {
                    setStatus("idle");
                    setError("Upload cancelled");
                    return null;
                }
                const msg =
                    typeof e?.message === "string" ? e.message : "Upload failed";
                setStatus("error");
                setError(msg);
                throw e;
            } finally {
                if (abortRef.current === controller) abortRef.current = null;
            }
        },
        [opts, validate, getPublicUrl, refreshSignedUrl]
    );

    return {
        status,
        isIdle: status === "idle",
        isUploading: status === "uploading",
        isSuccess: status === "success",
        isError: status === "error",
        error,
        result,
        progress,

        upload,
        remove,
        refreshSignedUrl,
        getPublicUrl,
        cancel,
        reset,
    };
}
