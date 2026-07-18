import { useSyncExternalStore } from 'react';

import {
    getMapDownloadState,
    startMapDownload,
    subscribeMapDownload,
    type MapDownloadState,
} from '@/lib/mapDownloadStore';

type SyncMode = 'missing' | 'registered' | 'all';

export function useMapDownload(): MapDownloadState & {
    startDownload: (mode: SyncMode) => Promise<void>;
} {
    const state = useSyncExternalStore(
        subscribeMapDownload,
        getMapDownloadState,
        getMapDownloadState,
    );

    return {
        ...state,
        startDownload: startMapDownload,
    };
}
