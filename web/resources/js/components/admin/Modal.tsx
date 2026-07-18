import { useEffect } from 'react';
import type { ReactNode } from 'react';

export default function Modal({
    show,
    title,
    onClose,
    size = 'lg',
    children,
}: {
    show: boolean;
    title: string;
    onClose: () => void;
    size?: 'lg' | 'xl';
    children: ReactNode;
}) {
    useEffect(() => {
        if (!show) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onClose]);

    if (!show) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="bg-opacity-20 fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-sm"
        >
            <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
                tabIndex={-1}
            />
            <div
                className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${
                    size === 'xl' ? 'max-w-3xl' : 'max-w-lg'
                }`}
            >
                <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path
                                d="m6 6 12 12M18 6 6 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
