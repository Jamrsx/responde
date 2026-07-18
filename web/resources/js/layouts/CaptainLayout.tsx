import type { ReactNode } from 'react';

import PortalLayout from '@/layouts/PortalLayout';
import type { PortalNavItem } from '@/layouts/PortalLayout';

const navItems: PortalNavItem[] = [
    {
        label: 'Dashboard',
        href: '/captain',
        icon: (
            <path
                d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
        ),
    },
];

export default function CaptainLayout({
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
            brandLabel="Barangay Captain"
            storageKey="responde-captain-sidebar-collapsed"
            navItems={navItems}
            homeHref="/captain"
            actions={actions}
            fullWidth={fullWidth}
        >
            {children}
        </PortalLayout>
    );
}
