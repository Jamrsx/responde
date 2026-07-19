export const STATION_ICON_KEYS = [
    'police',
    'fire',
    'disaster',
    'medical',
    'security',
    'rescue',
    'government',
    'generic',
] as const;

export type StationIconKey = (typeof STATION_ICON_KEYS)[number];

type StationIconOption = {
    key: StationIconKey;
    label: string;
    svg: string;
};

export const STATION_ICONS: StationIconOption[] = [
    {
        key: 'police',
        label: 'Police',
        svg: '<path d="M12 2.8 19 6v5.2c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3.2Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="11" r="2.4" fill="currentColor"/>',
    },
    {
        key: 'fire',
        label: 'Fire / BFP',
        svg: '<path d="M13.3 2.8c.8 4-2.3 4.8-1.2 7.8 1.1-1 1.8-2.2 2-3.6 2.5 2.2 4.1 4.8 3.7 8a6 6 0 0 1-11.8-.8c0-2.7 1.4-5.1 4.3-7.7-.2 2.1.4 3.4 1.2 4.1-.4-3.6 2-4.6 1.8-7.8Z" fill="currentColor"/>',
    },
    {
        key: 'disaster',
        label: 'DRRMO',
        svg: '<path d="M12 3 22 20H2L12 3Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
    },
    {
        key: 'medical',
        label: 'Health',
        svg: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" fill="currentColor"/>',
    },
    {
        key: 'security',
        label: 'Tanod / Security',
        svg: '<path d="M12 2.8 19 6v5.2c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3.2Z" fill="currentColor"/>',
    },
    {
        key: 'rescue',
        label: 'Rescue',
        svg: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="m6 6 3.8 3.8M18 6l-3.8 3.8M6 18l3.8-3.8M18 18l-3.8-3.8" stroke="currentColor" stroke-width="2"/>',
    },
    {
        key: 'government',
        label: 'Government',
        svg: '<path d="m12 3 9 4H3l9-4ZM5 9h14v2H5V9Zm1 3h2v6H6v-6Zm5 0h2v6h-2v-6Zm5 0h2v6h-2v-6ZM3 19h18v2H3v-2Z" fill="currentColor"/>',
    },
    {
        key: 'generic',
        label: 'Other',
        svg: '<path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/>',
    },
];

export function defaultStationIcon(
    typeCode: string | null | undefined,
): StationIconKey {
    const defaults: Record<string, StationIconKey> = {
        pnp: 'police',
        bfp: 'fire',
        drrmo: 'disaster',
        health: 'medical',
        tanod: 'security',
    };

    return typeCode ? (defaults[typeCode] ?? 'generic') : 'generic';
}

export function resolveStationIcon(
    iconKey: string | null | undefined,
    typeCode?: string | null,
): StationIconKey {
    const isKnown =
        !!iconKey && STATION_ICON_KEYS.includes(iconKey as StationIconKey);

    // Prefer an explicitly chosen non-generic icon.
    if (isKnown && iconKey !== 'generic') {
        return iconKey as StationIconKey;
    }

    const fromType = defaultStationIcon(typeCode);

    if (fromType !== 'generic') {
        return fromType;
    }

    return isKnown ? (iconKey as StationIconKey) : 'generic';
}

export function stationIconLabel(iconKey: StationIconKey): string {
    return (
        STATION_ICONS.find((option) => option.key === iconKey)?.label ?? 'Other'
    );
}

/** SVG paths with explicit white fill/stroke for Leaflet map markers. */
export function stationMarkerSvg(
    key: StationIconKey | null | undefined,
): string {
    const resolved = resolveStationIcon(key);
    const paths: Record<StationIconKey, string> = {
        police: '<path d="M12 2.8 19 6v5.2c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3.2Z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="11" r="2.4" fill="#fff"/>',
        fire: '<path d="M12 3c1.2 2.8-.2 4.2.8 6.4 1.4-1.2 2.2-2.6 2.4-4.2 2.8 2.4 4.4 5.2 4 8.4a6.2 6.2 0 0 1-12.4-.6c0-2.8 1.6-5.2 4.6-7.8-.4 2.2.4 3.6 1.4 4.4C12.2 7.4 13.4 5.8 12 3Z" fill="#fff"/>',
        disaster:
            '<path d="M12 3 22 20H2L12 3Z" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 9v5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="#fff"/>',
        medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" fill="#fff"/>',
        security:
            '<path d="M12 2.8 19 6v5.2c0 4.4-2.9 8.2-7 10-4.1-1.8-7-5.6-7-10V6l7-3.2Z" fill="#fff"/>',
        rescue: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="2"/><path d="m6 6 3.8 3.8M18 6l-3.8 3.8M6 18l3.8-3.8M18 18l-3.8-3.8" stroke="#fff" stroke-width="2"/>',
        government:
            '<path d="m12 3 9 4H3l9-4ZM5 9h14v2H5V9Zm1 3h2v6H6v-6Zm5 0h2v6h-2v-6Zm5 0h2v6h-2v-6ZM3 19h18v2H3v-2Z" fill="#fff"/>',
        generic:
            '<path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="9" r="2.5" fill="#fff"/>',
    };

    return paths[resolved];
}

export function stationIconSvg(key: StationIconKey | null | undefined): string {
    return (
        STATION_ICONS.find((option) => option.key === key)?.svg ??
        STATION_ICONS.at(-1)!.svg
    );
}

export function StationIcon({
    iconKey,
    className = 'h-5 w-5',
}: {
    iconKey: StationIconKey;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: stationIconSvg(iconKey) }}
        />
    );
}

export function StationIconPicker({
    value,
    onChange,
}: {
    value: StationIconKey;
    onChange: (iconKey: StationIconKey) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">
                Map icon
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATION_ICONS.map((option) => {
                    const selected = option.key === value;

                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onChange(option.key)}
                            aria-pressed={selected}
                            className={`flex min-h-16 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                                selected
                                    ? 'border-brand bg-brand-light text-brand-dark ring-1 ring-brand/20'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <StationIcon
                                iconKey={option.key}
                                className="h-6 w-6 shrink-0"
                            />
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
