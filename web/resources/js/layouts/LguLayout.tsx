import type { ReactNode } from 'react';

import PortalLayout from '@/layouts/PortalLayout';
import type { PortalNavItem } from '@/layouts/PortalLayout';

const navItems: PortalNavItem[] = [
    {
        label: 'Dashboard',
        href: '/lgu',
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
        label: 'Barangays',
        href: '/lgu/barangays',
        icon: (
            <path
                d="M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'Stations',
        href: '/lgu/stations',
        icon: (
            <path
                d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'Chiefs',
        href: '/lgu/chiefs',
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
];

export default function LguLayout({
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
    return (
        <PortalLayout
            title={title}
            description={description}
            brandLabel="LGU Admin"
            storageKey="responde-lgu-sidebar-collapsed"
            navItems={navItems}
            homeHref="/lgu"
            actions={actions}
            fullWidth={fullWidth}
        >
            {children}
        </PortalLayout>
    );
}
