import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import FormField, { inputClassName } from '@/components/admin/FormField';
import LguMapPicker from '@/components/admin/LguMapPicker';
import type { LguSelection } from '@/components/admin/LguMapPicker';

export type LguFormValues = {
    name: string;
    code: string;
    province: string;
    municipality: string;
    contact_number: string;
    psgc_code: string;
    classification: string;
    region: string;
    latitude: number | '';
    longitude: number | '';
    area_km2: number | '';
    is_active: boolean;
};

export const emptyLguForm: LguFormValues = {
    name: '',
    code: '',
    province: '',
    municipality: '',
    contact_number: '',
    psgc_code: '',
    classification: '',
    region: '',
    latitude: '',
    longitude: '',
    area_km2: '',
    is_active: true,
};

const lockedInputClassName = `${inputClassName} cursor-default bg-slate-50 text-slate-600 focus:border-slate-300 focus:ring-0`;

export default function LguForm({
    initial,
    mode,
    submitUrl,
}: {
    initial: LguFormValues;
    mode: 'create' | 'edit';
    submitUrl: string;
}) {
    const form = useForm<LguFormValues>(initial);
    const isEdit = mode === 'edit';

    const applyMapSelection = (selection: LguSelection) => {
        if (isEdit) {
            console.log(
                '[Responde Admin] Edit mode — map selection ignored',
                selection.psgc,
            );

            return;
        }

        form.setData((data) => ({
            ...data,
            name: selection.name,
            municipality: selection.name,
            province: selection.province ?? '',
            region: selection.region,
            psgc_code: selection.psgc,
            classification: selection.classification,
            code: selection.postal_code ?? '',
            latitude: selection.latitude,
            longitude: selection.longitude,
            area_km2: selection.area_km2,
        }));
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        console.log(
            `[Responde Admin] ${isEdit ? 'Updating' : 'Creating'} LGU`,
            form.data,
        );

        if (isEdit) {
            form.put(submitUrl);
        } else {
            form.post(submitUrl);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.8fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-4">
                        <h2 className="text-base font-bold tracking-tight text-slate-900">
                            {isEdit
                                ? 'Mapped LGU location'
                                : 'Select LGU on the map'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {isEdit
                                ? 'The assigned city or municipality cannot be changed here. Use pan and zoom to review the boundary.'
                                : 'Search or click a city/municipality. The postal / ZIP code is filled automatically when available.'}
                        </p>
                    </div>

                    <LguMapPicker
                        selectedPsgc={form.data.psgc_code || null}
                        onSelect={applyMapSelection}
                        selectionLocked={isEdit}
                        mapClassName="h-[min(78vh,820px)] w-full min-h-[520px]"
                        initialCenter={
                            typeof form.data.latitude === 'number' &&
                            typeof form.data.longitude === 'number'
                                ? [form.data.latitude, form.data.longitude]
                                : null
                        }
                    />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-24 xl:self-start">
                    <h2 className="mb-4 text-base font-bold tracking-tight text-slate-900">
                        LGU details
                    </h2>

                    {form.data.psgc_code ? (
                        <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">
                            <span className="font-semibold">
                                {form.data.name}
                            </span>
                            <span>{form.data.classification}</span>
                            {form.data.province && (
                                <span>{form.data.province}</span>
                            )}
                            {form.data.region && (
                                <span>{form.data.region}</span>
                            )}
                            {form.data.code && (
                                <span className="font-semibold">
                                    ZIP {form.data.code}
                                </span>
                            )}
                            {form.data.area_km2 !== '' && (
                                <span>≈ {form.data.area_km2} km²</span>
                            )}
                            <span className="text-xs opacity-70">
                                PSGC {form.data.psgc_code}
                            </span>
                        </div>
                    ) : (
                        <p className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Select an LGU on the map to fill location and postal
                            code details automatically.
                        </p>
                    )}

                    {form.errors.psgc_code && (
                        <p role="alert" className="mb-3 text-sm text-red-600">
                            {form.errors.psgc_code}
                        </p>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
                        <FormField
                            label="LGU name"
                            htmlFor="lgu-name"
                            error={form.errors.name}
                        >
                            <input
                                id="lgu-name"
                                type="text"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                                readOnly={isEdit}
                                placeholder="e.g. Opol"
                                className={
                                    isEdit
                                        ? lockedInputClassName
                                        : inputClassName
                                }
                            />
                        </FormField>

                        <FormField
                            label="Postal / ZIP code"
                            htmlFor="lgu-code"
                            error={form.errors.code}
                        >
                            <input
                                id="lgu-code"
                                type="text"
                                inputMode="numeric"
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData('code', event.target.value)
                                }
                                placeholder="e.g. 9009"
                                className={inputClassName}
                            />
                        </FormField>

                        <FormField
                            label="Contact number (optional)"
                            htmlFor="lgu-contact"
                            error={form.errors.contact_number}
                        >
                            <input
                                id="lgu-contact"
                                type="tel"
                                value={form.data.contact_number}
                                onChange={(event) =>
                                    form.setData(
                                        'contact_number',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. 088-123-4567"
                                className={inputClassName}
                            />
                        </FormField>

                        <FormField
                            label="Municipality / City"
                            htmlFor="lgu-municipality"
                            error={form.errors.municipality}
                        >
                            <input
                                id="lgu-municipality"
                                type="text"
                                value={form.data.municipality}
                                onChange={(event) =>
                                    form.setData(
                                        'municipality',
                                        event.target.value,
                                    )
                                }
                                readOnly={isEdit}
                                placeholder="Filled from map"
                                className={
                                    isEdit
                                        ? lockedInputClassName
                                        : inputClassName
                                }
                            />
                        </FormField>

                        <FormField
                            label="Province"
                            htmlFor="lgu-province"
                            error={form.errors.province}
                        >
                            <input
                                id="lgu-province"
                                type="text"
                                value={form.data.province}
                                onChange={(event) =>
                                    form.setData('province', event.target.value)
                                }
                                readOnly={isEdit}
                                placeholder="Filled from map"
                                className={
                                    isEdit
                                        ? lockedInputClassName
                                        : inputClassName
                                }
                            />
                        </FormField>

                        {isEdit && (
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end text-sm text-slate-700 md:col-span-2 xl:col-span-1">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_active}
                                    onChange={(event) =>
                                        form.setData(
                                            'is_active',
                                            event.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                Active — this LGU can operate in Responde
                            </label>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Link
                            href="/admin/lgus"
                            className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing
                                ? 'Saving...'
                                : isEdit
                                  ? 'Save changes'
                                  : 'Add LGU'}
                        </button>
                    </div>
                </section>
            </div>
        </form>
    );
}
