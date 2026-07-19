import { useEffect, useState } from 'react';

type StationLogoFieldProps = {
    id?: string;
    currentUrl?: string | null;
    error?: string;
    onFileChange: (file: File | null) => void;
    onRemoveCurrent?: () => void;
    removeRequested?: boolean;
};

export default function StationLogoField({
    id = 'station-logo',
    currentUrl = null,
    error,
    onFileChange,
    onRemoveCurrent,
    removeRequested = false,
}: StationLogoFieldProps) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const displayed = preview ?? (removeRequested ? null : currentUrl);

    const selectFile = (file: File | null) => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setPreview(file ? URL.createObjectURL(file) : null);
        onFileChange(file);
        console.log('[Responde LGU] Station logo selected', {
            name: file?.name,
            size: file?.size,
            type: file?.type,
        });
    };

    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-slate-700"
            >
                Official station logo
            </label>
            <p className="text-xs text-slate-500">
                Optional. JPG, PNG, or WebP up to 2 MB. Used on maps and lists
                instead of the preset icon.
            </p>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    {displayed ? (
                        <img
                            src={displayed}
                            alt="Station logo preview"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            None
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <label
                        htmlFor={id}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        {displayed ? 'Replace logo' : 'Upload logo'}
                    </label>
                    <input
                        id={id}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            selectFile(file);
                            event.target.value = '';
                        }}
                    />
                    {preview && (
                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => selectFile(null)}
                        >
                            Clear selection
                        </button>
                    )}
                    {!preview && currentUrl && onRemoveCurrent && (
                        <button
                            type="button"
                            className="inline-flex min-h-11 items-center rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                            onClick={() => {
                                console.log(
                                    '[Responde LGU] Station logo remove requested',
                                );
                                onRemoveCurrent();
                            }}
                        >
                            {removeRequested ? 'Keep current logo' : 'Remove logo'}
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
