import { Head, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { resolveStationIcon } from '@/components/lgu/stationIcons';
import type { StationIconKey } from '@/components/lgu/stationIcons';
import StationPointMap from '@/components/lgu/StationPointMap';
import ChiefLayout from '@/layouts/ChiefLayout';

type Props = {
    station: {
        id: number;
        name: string;
        latitude: string;
        longitude: string;
        logo_url: string | null;
        icon_key: StationIconKey;
        type_code: string | null;
        proposed_latitude: string | null;
        proposed_longitude: string | null;
        location_update_status: 'pending' | 'approved' | 'rejected' | null;
        location_update_note: string | null;
        location_update_review_note: string | null;
        location_update_requested_at: string | null;
        location_update_reviewed_at: string | null;
    };
    lgu: {
        name: string;
        latitude: string | null;
        longitude: string | null;
    };
    mapUrl: string | null;
};

const statusStyle = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
};

export default function ChiefStationLocation({
    station,
    lgu,
    mapUrl,
}: Props) {
    const isPending = station.location_update_status === 'pending';
    const startingLatitude =
        isPending && station.proposed_latitude
            ? station.proposed_latitude
            : station.latitude;
    const startingLongitude =
        isPending && station.proposed_longitude
            ? station.proposed_longitude
            : station.longitude;
    const form = useForm({
        latitude: startingLatitude,
        longitude: startingLongitude,
        note: isPending ? (station.location_update_note ?? '') : '',
    });
    const [proposalPlaced, setProposalPlaced] = useState(isPending);
    const [locating, setLocating] = useState(false);
    const [locationMessage, setLocationMessage] = useState<string | null>(null);
    const [focusPosition, setFocusPosition] = useState<{
        latitude: number;
        longitude: number;
        zoom: number;
    } | null>(null);

    const center = useMemo<[number, number]>(() => {
        if (station.latitude && station.longitude) {
            return [Number(station.latitude), Number(station.longitude)];
        }

        if (lgu.latitude && lgu.longitude) {
            return [Number(lgu.latitude), Number(lgu.longitude)];
        }

        return [12.8797, 121.774];
    }, [lgu.latitude, lgu.longitude, station.latitude, station.longitude]);

    const currentMarker = useMemo(
        () => [
            {
                id: `current-${station.id}`,
                name: `${station.name} · Current approved location`,
                latitude: Number(station.latitude),
                longitude: Number(station.longitude),
                color: '#047857',
                iconKey: resolveStationIcon(
                    station.icon_key,
                    station.type_code,
                ),
                logoUrl: station.logo_url,
            },
        ],
        [station],
    );

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationMessage('Location is not supported by this browser.');

            return;
        }

        setLocating(true);
        setLocationMessage('Getting your current location...');
        console.log('[Responde Chief] Requesting station GPS location');

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const latitude = Number(coords.latitude.toFixed(7));
                const longitude = Number(coords.longitude.toFixed(7));

                form.setData((data) => ({
                    ...data,
                    latitude: String(latitude),
                    longitude: String(longitude),
                }));
                setProposalPlaced(true);
                setFocusPosition({ latitude, longitude, zoom: 19 });
                setLocationMessage(
                    `Location captured with approximately ${Math.round(coords.accuracy)} m accuracy.`,
                );
                setLocating(false);
                console.log('[Responde Chief] Station GPS location captured', {
                    latitude,
                    longitude,
                    accuracy: coords.accuracy,
                });
            },
            (error) => {
                setLocationMessage(
                    error.code === error.PERMISSION_DENIED
                        ? 'Location permission was denied. Allow location access and try again.'
                        : 'Your location could not be detected. Try again or place the pin manually.',
                );
                setLocating(false);
                console.error(
                    '[Responde Chief] Station GPS location failed',
                    error,
                );
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        console.log('[Responde Chief] Submitting station location request', {
            stationId: station.id,
            latitude: form.data.latitude,
            longitude: form.data.longitude,
        });
        form.post('/chief/station-location', {
            preserveScroll: true,
        });
    };

    return (
        <ChiefLayout
            title="Station Location"
            description={`Review the approved office placement for ${station.name}`}
            fullWidth
        >
            <Head title="Station Location" />

            {station.location_update_status && (
                <div
                    role="status"
                    className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                        statusStyle[station.location_update_status]
                    }`}
                >
                    <p className="font-semibold capitalize">
                        Location request {station.location_update_status}
                    </p>
                    <p className="mt-1 text-xs leading-5">
                        {isPending
                            ? `Sent ${station.location_update_requested_at ?? 'recently'}. The current station location remains active until the LGU approves this request.`
                            : station.location_update_status === 'approved'
                              ? `Reviewed ${station.location_update_reviewed_at ?? 'recently'}. The approved map location has been updated.`
                              : `Reviewed ${station.location_update_reviewed_at ?? 'recently'}. You may adjust the pin and submit another request.`}
                    </p>
                    {station.location_update_review_note && (
                        <p className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-xs">
                            LGU note: {station.location_update_review_note}
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-slate-900">
                                Office placement
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Green is the approved location. Blue is your
                                proposed location.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={useCurrentLocation}
                            disabled={locating || isPending}
                            className="inline-flex min-h-11 items-center rounded-lg border border-brand bg-white px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {locating
                                ? 'Getting location...'
                                : 'Use my current location'}
                        </button>
                    </div>

                    {locationMessage && (
                        <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                            {locationMessage}
                        </p>
                    )}

                    <StationPointMap
                        center={center}
                        markers={currentMarker}
                        selected={
                            proposalPlaced &&
                            form.data.latitude &&
                            form.data.longitude
                                ? {
                                      latitude: Number(form.data.latitude),
                                      longitude: Number(form.data.longitude),
                                  }
                                : null
                        }
                        selectedIconKey={resolveStationIcon(
                            station.icon_key,
                            station.type_code,
                        )}
                        selectedLogoUrl={station.logo_url}
                        focusPosition={focusPosition}
                        fitMarkers
                        onPick={
                            isPending
                                ? undefined
                                : (latitude, longitude) => {
                                      form.setData((data) => ({
                                          ...data,
                                          latitude: String(latitude),
                                          longitude: String(longitude),
                                      }));
                                      setProposalPlaced(true);
                                      console.log(
                                          '[Responde Chief] Proposed station pin moved',
                                          { latitude, longitude },
                                      );
                                  }
                        }
                        pickEnabled={!isPending}
                        boundaryUrl={mapUrl}
                        className="h-[min(65vh,620px)] min-h-[400px] w-full"
                    />
                </section>

                <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        {isPending
                            ? 'Pending request'
                            : 'Request a correction'}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {isPending
                            ? 'The LGU must review this proposal before the station pin changes.'
                            : 'Stand at the station office and use your current location for the most accurate result.'}
                    </p>

                    <form onSubmit={submit} className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <label className="text-sm font-semibold text-slate-700">
                                Latitude
                                <input
                                    value={
                                        proposalPlaced
                                            ? form.data.latitude
                                            : 'Not selected'
                                    }
                                    readOnly
                                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-700"
                                />
                            </label>
                            <label className="text-sm font-semibold text-slate-700">
                                Longitude
                                <input
                                    value={
                                        proposalPlaced
                                            ? form.data.longitude
                                            : 'Not selected'
                                    }
                                    readOnly
                                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-700"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-semibold text-slate-700">
                            Reason or note
                            <textarea
                                value={form.data.note}
                                onChange={(event) =>
                                    form.setData('note', event.target.value)
                                }
                                disabled={isPending}
                                rows={4}
                                maxLength={1000}
                                placeholder="Explain why the current pin is incorrect."
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-slate-50"
                            />
                        </label>

                        {(form.errors.latitude ||
                            form.errors.longitude ||
                            form.errors.note) && (
                            <p role="alert" className="text-sm text-red-600">
                                {form.errors.latitude ??
                                    form.errors.longitude ??
                                    form.errors.note}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                isPending ||
                                !proposalPlaced ||
                                form.processing
                            }
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {form.processing
                                ? 'Sending request...'
                                : isPending
                                  ? 'Awaiting LGU review'
                                  : 'Send location request'}
                        </button>
                    </form>
                </aside>
            </div>
        </ChiefLayout>
    );
}
