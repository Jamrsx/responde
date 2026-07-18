<?php

namespace App\Http\Controllers;

use App\Models\LguBarangayMap;
use Illuminate\Http\Response;

class BarangayMapController extends Controller
{
    public function show(string $psgc): Response
    {
        abort_unless(preg_match('/^\d{10}$/', $psgc) === 1, 404);

        $map = LguBarangayMap::query()
            ->where('psgc_code', $psgc)
            ->firstOrFail();

        $etag = '"'.hash('sha256', $map->geojson).'"';

        if (request()->header('If-None-Match') === $etag) {
            return response('', 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }

        return response($map->geojson, 200, [
            'Content-Type' => 'application/geo+json; charset=UTF-8',
            'Cache-Control' => 'public, max-age=86400',
            'ETag' => $etag,
        ]);
    }
}
