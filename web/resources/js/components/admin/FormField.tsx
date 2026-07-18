import type { ReactNode } from 'react';

export const inputClassName =
    'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand-light';

export default function FormField({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-1.5 block text-sm font-medium text-slate-700"
            >
                {label}
            </label>
            {children}
            {error && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
