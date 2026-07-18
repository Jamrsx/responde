import { Head, Link } from '@inertiajs/react';

import AdminLayout from '@/layouts/AdminLayout';

import LguForm, { emptyLguForm } from './LguForm';

export default function CreateLgu() {
    return (
        <AdminLayout
            title="Add LGU"
            description="Pick a city or municipality on the map, then save it to Responde"
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
            <Head title="Add LGU" />
            <LguForm
                mode="create"
                submitUrl="/admin/lgus"
                initial={emptyLguForm}
            />
        </AdminLayout>
    );
}
