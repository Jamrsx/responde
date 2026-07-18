import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { destroy } from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import MapDownloadToast from '@/components/admin/MapDownloadToast';
import Modal from '@/components/admin/Modal';

type AuthUser = {
    name: string;
    email: string;
    role: string;
    profile_photo_path: string | null;
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

type NavItem = {
    label: string;
    href: string;
    icon: ReactNode;
};

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/admin',
        icon: (
            <path
                d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'LGUs',
        href: '/admin/lgus',
        icon: (
            <path
                d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'LGU Admins',
        href: '/admin/lgu-admins',
        icon: (
            <path
                d="M16 19a4 4 0 0 0-8 0m9-9.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'Maps',
        href: '/admin/maps',
        icon: (
            <>
                <path
                    d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                />
                <path
                    d="M9 3v15M15 6v15"
                    stroke="currentColor"
                    strokeWidth="1.7"
                />
            </>
        ),
    },
];

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

function SidebarContent({
    currentPath,
    collapsed = false,
    onSignOutRequest,
}: {
    currentPath: string;
    collapsed?: boolean;
    onSignOutRequest: () => void;
}) {
    const { auth } = usePage<SharedPageProps>().props;
    const photoUrl = auth.user?.profile_photo_path
        ? `/storage/${auth.user.profile_photo_path}`
        : null;
    const initial = auth.user?.name?.trim().charAt(0).toUpperCase() || 'U';

    return (
        <div className="flex h-full flex-col">
            <div
                className={`flex items-center py-6 ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-5'
                }`}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                    <img
                        src="/respondelogo.jpg"
                        alt="Responde logo"
                        className="h-full w-full object-contain p-0.5"
                    />
                </div>
                <div className={collapsed ? 'hidden' : 'min-w-0'}>
                    <p className="truncate text-base font-bold tracking-tight text-slate-900">
                        Responde
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                        Super Admin
                    </p>
                </div>
            </div>

            <nav
                className={`flex-1 space-y-1 overflow-y-auto ${
                    collapsed ? 'px-2' : 'px-3'
                }`}
                aria-label="Admin navigation"
            >
                {navItems.map((item) => {
                    const isActive =
                        item.href === '/admin'
                            ? currentPath === item.href
                            : currentPath.startsWith(item.href);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            aria-label={collapsed ? item.label : undefined}
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
                    aria-label={collapsed ? 'My Profile' : undefined}
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
                    onClick={onSignOutRequest}
                    title={collapsed ? 'Sign out' : undefined}
                    aria-label={collapsed ? 'Sign out' : undefined}
                    className={`flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        collapsed ? 'px-2' : 'gap-2 px-3'
                    }`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path
                            d="M15 12H4m0 0 4-4m-4 4 4 4m4-13h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {!collapsed && 'Sign out'}
                </button>
            </div>
        </div>
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
            console.log('[Responde Admin] Flash message:', message);
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
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
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
    );
}

export default function AdminLayout({
    title,
    description,
    actions,
    fullWidth = false,
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    fullWidth?: boolean;
    children: ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return (
            window.localStorage.getItem('responde-admin-sidebar-collapsed') ===
            'true'
        );
    });
    const currentPath = usePage().url.split('?')[0];

    useEffect(() => {
        window.localStorage.setItem(
            'responde-admin-sidebar-collapsed',
            String(sidebarCollapsed),
        );
        console.log('[Responde Admin] Sidebar preference changed', {
            collapsed: sidebarCollapsed,
        });
    }, [sidebarCollapsed]);

    const openLogoutConfirm = () => {
        console.log('[Responde Admin] Sign out confirm opened');
        setSidebarOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        console.log('[Responde Admin] Logging out');
        setLoggingOut(true);
        router.post(destroy.url(), undefined, {
            onFinish: () => setLoggingOut(false),
            onError: () => {
                setLoggingOut(false);
                setShowLogoutConfirm(false);
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            <aside
                className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block ${
                    sidebarCollapsed ? 'w-20' : 'w-64'
                }`}
            >
                <SidebarContent
                    currentPath={currentPath}
                    collapsed={sidebarCollapsed}
                    onSignOutRequest={openLogoutConfirm}
                />
                <button
                    type="button"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    aria-label={
                        sidebarCollapsed
                            ? 'Expand sidebar'
                            : 'Collapse sidebar'
                    }
                    aria-expanded={!sidebarCollapsed}
                    title={
                        sidebarCollapsed
                            ? 'Expand sidebar'
                            : 'Collapse sidebar'
                    }
                    className="absolute top-7 -right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className={`h-4 w-4 transition-transform ${
                            sidebarCollapsed ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                    >
                        <path
                            d="m14 6-6 6 6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
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
                        <SidebarContent
                            currentPath={currentPath}
                            onSignOutRequest={openLogoutConfirm}
                        />
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
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-6 w-6"
                                aria-hidden="true"
                            >
                                <path
                                    d="M4 6h16M4 12h16M4 18h16"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
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

            <MapDownloadToast />

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
                            className="min-h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loggingOut ? 'Signing out...' : 'Yes, sign out'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
