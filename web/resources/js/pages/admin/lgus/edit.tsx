import { Head, Link } from '@inertiajs/react';

import AdminLayout from '@/layouts/AdminLayout';

import LguForm from './LguForm';
import type { LguFormValues } from './LguForm';

type EditableLgu = {
    id: number;
    name: string;
    code: string | null;
    province: string | null;
    municipality: string | null;
    contact_number: string | null;
    psgc_code: string | null;
    classification: string | null;
    region: string | null;
    latitude: string | null;
    longitude: string | null;
    area_km2: string | null;
    is_active: boolean;
};

export default function EditLgu({ lgu }: { lgu: EditableLgu }) {
    const initial: LguFormValues = {
        name: lgu.name,
        code: lgu.code ?? '',
        province: lgu.province ?? '',
        municipality: lgu.municipality ?? '',
        contact_number: lgu.contact_number ?? '',
        psgc_code: lgu.psgc_code ?? '',
        classification: lgu.classification ?? '',
        region: lgu.region ?? '',
        latitude: lgu.latitude ? Number(lgu.latitude) : '',
        longitude: lgu.longitude ? Number(lgu.longitude) : '',
        area_km2: lgu.area_km2 ? Number(lgu.area_km2) : '',
        is_active: lgu.is_active,
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        set_admin_password: false,
        admin_password: '',
    };

    return (
        <AdminLayout
            title={`Edit ${lgu.name}`}
            description="Update the mapped LGU and its details"
            fullWidth
            actions={
                <Link
                    href="/admin/lgus"
                    className="flex min-h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                    Back to LGUs
                </Link>
            }
        >
            <Head title={`Edit ${lgu.name}`} />
            <LguForm
                mode="edit"
                submitUrl={`/admin/lgus/${lgu.id}`}
                initial={initial}
            />
        </AdminLayout>
    );
}
