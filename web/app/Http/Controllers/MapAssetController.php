<?php

namespace App\Http\Controllers;

use App\Models\MapAsset;
use Illuminate\Http\Response;

class MapAssetController extends Controller
{
    public function municipalities(): Response
    {
        $asset = MapAsset::query()
            ->where('key', 'ph-municities')
            ->firstOrFail();

        $etag = '"'.($asset->source_hash ?: hash('sha256', $asset->geojson)).'"';

        if (request()->header('If-None-Match') === $etag) {
            return response('', 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        return response($asset->geojson, 200, [
            'Content-Type' => 'application/geo+json; charset=UTF-8',
            'Cache-Control' => 'public, max-age=86400',
            'ETag' => $etag,
        ]);
    }
}
