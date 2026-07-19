import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { destroy } from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import Modal from '@/components/admin/Modal';

type AuthUser = {
    name: string;
    email: string;
    role: string;
    profile_photo_path: string | null;
    avatar_url: string | null;
};

type SharedPageProps = {
    auth: {
        user: AuthUser | null;
    };
    flash: {
        success: string | null;
        error: string | null;
    };
};

export type PortalNavItem = {
    label: string;
    href: string;
    icon: ReactNode;
};

function NavIcon({ children }: { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

function FlashBanner() {
    const { flash } = usePage<SharedPageProps>().props;
    const [dismissedMessage, setDismissedMessage] = useState<string | null>(
        null,
    );
    const message = flash.success ?? flash.error;
    const isError = Boolean(flash.error);

    useEffect(() => {
        if (message) {
            console.log('[Responde Portal] Flash message:', message);
        }
    }, [message]);

    if (!message || message === dismissedMessage) {
        return null;
    }

    return (
        <div
            role="status"
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
                isError
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={() => setDismissedMessage(message)}
                aria-label="Dismiss message"
                className="shrink-0 text-current opacity-60 transition hover:opacity-100"
            >
                ×
            </button>
        </div>
    );
}

export default function PortalLayout({
    title,
    description,
    brandLabel,
    storageKey,
    navItems,
    homeHref,
    actions,
    fullWidth = false,
    children,
}: {
    title: string;
    description?: string;
    brandLabel: string;
    storageKey: string;
    navItems: PortalNavItem[];
    homeHref: string;
    actions?: ReactNode;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    const { auth } = usePage<SharedPageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem(storageKey) === 'true';
    });
    const currentPath = usePage().url.split('?')[0];
    const photoUrl = auth.user?.avatar_url ?? null;
    const initial = auth.user?.name?.trim().charAt(0).toUpperCase() || 'U';

    useEffect(() => {
        window.localStorage.setItem(storageKey, String(sidebarCollapsed));
    }, [sidebarCollapsed, storageKey]);

    const openLogoutConfirm = () => {
        setSidebarOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        console.log('[Responde Portal] Logging out');
        setLoggingOut(true);
        router.post(destroy.url(), undefined, {
            onFinish: () => setLoggingOut(false),
            onError: () => {
                setLoggingOut(false);
                setShowLogoutConfirm(false);
            },
        });
    };

    const sidebar = (collapsed: boolean) => (
        <div className="flex h-full flex-col">
            <div
                className={`flex items-center py-6 ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-5'
                }`}
            >
                <Link
                    href={homeHref}
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200"
                >
                    <img
                        src="/respondelogo.jpg"
                        alt="Responde logo"
                        className="h-full w-full object-contain p-0.5"
                    />
                </Link>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold tracking-tight text-slate-900">
                            Responde
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                            {brandLabel}
                        </p>
                    </div>
                )}
            </div>

            <nav
                className={`flex-1 space-y-1 overflow-y-auto ${
                    collapsed ? 'px-2' : 'px-3'
                }`}
                aria-label="Portal navigation"
            >
                {navItems.map((item) => {
                    const isActive =
                        item.href === homeHref
                            ? currentPath === item.href
                            : currentPath.startsWith(item.href);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            className={`flex min-h-11 items-center rounded-lg text-sm font-medium transition ${
                                collapsed
                                    ? 'justify-center px-2'
                                    : 'gap-3 px-3'
                            } ${
                                isActive
                                    ? 'bg-brand-light font-semibold text-brand-dark'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <NavIcon>{item.icon}</NavIcon>
                            {!collapsed && item.label}
                        </Link>
                    );
                })}
            </nav>

            <div
                className={`border-t border-slate-200 py-4 ${
                    collapsed ? 'px-2' : 'px-5'
                }`}
            >
                <Link
                    href="/profile"
                    title={collapsed ? 'My Profile' : undefined}
                    className={`mb-3 flex min-h-11 items-center rounded-lg transition hover:bg-slate-100 ${
                        collapsed ? 'justify-center' : 'gap-3 px-2'
                    }`}
                >
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                    ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                            {initial}
                        </span>
                    )}
                    {!collapsed && (
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                                {auth.user?.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                                {auth.user?.email}
                            </span>
                        </span>
                    )}
                </Link>
                <button
                    type="button"
                    onClick={openLogoutConfirm}
                    title={collapsed ? 'Sign out' : undefined}
                    className={`flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-100 ${
                        collapsed ? 'px-2' : 'gap-2 px-3'
                    }`}
                >
                    {!collapsed ? 'Sign out' : '⎋'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <aside
                className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block ${
                    sidebarCollapsed ? 'w-20' : 'w-64'
                }`}
            >
                {sidebar(sidebarCollapsed)}
                <button
                    type="button"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    aria-label={
                        sidebarCollapsed
                            ? 'Expand sidebar'
                            : 'Collapse sidebar'
                    }
                    className="absolute top-7 -right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
                >
                    <span
                        className={`transition-transform ${
                            sidebarCollapsed ? 'rotate-180' : ''
                        }`}
                    >
                        ‹
                    </span>
                </button>
            </aside>

            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setSidebarOpen(false)}
                        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                    />
                    <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-2xl">
                        {sidebar(false)}
                    </aside>
                </div>
            )}

            <div
                className={`transition-[padding] duration-200 ${
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
                }`}
            >
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                    <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open menu"
                            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 lg:hidden"
                        >
                            ☰
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                                {title}
                            </h1>
                            {description && (
                                <p className="hidden truncate text-xs text-slate-500 sm:block">
                                    {description}
                                </p>
                            )}
                        </div>
                        {actions && <div className="shrink-0">{actions}</div>}
                    </div>
                </header>

                <main className={fullWidth ? 'p-3 sm:p-4' : 'p-4 sm:p-6 lg:p-8'}>
                    <div className={fullWidth ? 'w-full' : 'mx-auto max-w-7xl'}>
                        <FlashBanner />
                        {children}
                    </div>
                </main>
            </div>

            <Modal
                show={showLogoutConfirm}
                title="Sign out"
                onClose={() => {
                    if (!loggingOut) {
                        setShowLogoutConfirm(false);
                    }
                }}
            >
                <div className="space-y-5">
                    <p className="text-sm leading-6 text-slate-600">
                        Are you sure you want to sign out of Responde?
                    </p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(false)}
                            disabled={loggingOut}
                            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmLogout}
                            disabled={loggingOut}
                            className="min-h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                            {loggingOut ? 'Signing out...' : 'Yes, sign out'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
