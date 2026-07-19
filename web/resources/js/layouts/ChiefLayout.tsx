import type { ReactNode } from 'react';

import PortalLayout from '@/layouts/PortalLayout';
import type { PortalNavItem } from '@/layouts/PortalLayout';

const navItems: PortalNavItem[] = [
    {
        label: 'Dashboard',
        href: '/chief',
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
        label: 'Response Requests',
        href: '/chief/requests',
        icon: (
            <path
                d="M12 3 3.8 18h16.4L12 3Zm0 5v4.5m0 3v.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'Station Location',
        href: '/chief/station-location',
        icon: (
            <path
                d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
    {
        label: 'Staff Accounts',
        href: '/chief/staff',
        icon: (
            <path
                d="M16 19a4 4 0 0 0-8 0m9-9.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM19 8v4m2-2h-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        ),
    },
];

export default function ChiefLayout({
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
            brandLabel="Station Chief"
            storageKey="responde-chief-sidebar-collapsed"
            navItems={navItems}
            homeHref="/chief"
            actions={actions}
            fullWidth={fullWidth}
        >
            {children}
        </PortalLayout>
    );
}
