<?php

namespace App\Console\Commands;

use App\Models\Lgu;
use App\Services\BarangayMapSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncBarangayMaps extends Command
{
    protected $signature = 'maps:sync-barangays
        {--psgc= : Sync one city or municipality PSGC code}
        {--registered-only : Sync only LGUs registered in Responde (default)}
        {--all : Sync every barangay map found in the source}
        {--force : Download maps even when the source hash is unchanged}
        {--concurrency=10 : Number of maps downloaded in each concurrent batch}';

    protected $description = 'Download and cache official LGU barangay GeoJSON maps';

    public function handle(BarangayMapSyncService $sync): int
    {
        $psgc = preg_replace('/\D+/', '', (string) $this->option('psgc')) ?? '';
        $syncAll = (bool) $this->option('all');
        $concurrency = max(1, min(25, (int) $this->option('concurrency')));

        if ($psgc !== '' && strlen($psgc) !== 10) {
            $this->error('The --psgc value must contain exactly 10 digits.');

            return self::FAILURE;
        }

        if ($syncAll && $psgc !== '') {
            $this->error('Use either --all or --psgc, not both.');

            return self::FAILURE;
        }

        $this->components->info('Listing barangay maps from the source...');

        try {
            $files = $sync->sourceFiles(refresh: true);
        } catch (Throwable $exception) {
            $this->error("Unable to list source maps: {$exception->getMessage()}");

            return self::FAILURE;
        }

        if ($psgc !== '') {
            $files = isset($files[$psgc]) ? [$psgc => $files[$psgc]] : [];
        } elseif (! $syncAll) {
            $registeredPsgcs = Lgu::query()
                ->whereNotNull('psgc_code')
                ->pluck('psgc_code')
                ->map(fn (string $code): string => preg_replace('/\D+/', '', $code) ?? '')
                ->filter()
                ->all();
            $files = array_intersect_key($files, array_flip($registeredPsgcs));
        }

        if ($files === []) {
            $this->warn('No matching barangay map files were found.');

            return self::SUCCESS;
        }

        $selection = $sync->pendingFiles(
            $files,
            force: (bool) $this->option('force'),
        );
        $pending = $selection['pending'];
        $skipped = $selection['skipped'];
        $total = count($files);

        $this->line(sprintf(
            'Found %d map(s): %d to download, %d already up to date. Concurrency: %d.',
            $total,
            count($pending),
            $skipped,
            $concurrency,
        ));

        $progress = $this->output->createProgressBar($total);
        $progress->setFormat(' %current%/%max% [%bar%] %percent:3s%%  %message%');
        $progress->setMessage($skipped > 0 ? "{$skipped} cached" : 'Starting');
        $progress->start();
        $progress->advance($skipped);

        $synced = 0;
        $failed = 0;

        foreach (array_chunk($pending, $concurrency, true) as $batch) {
            $result = $sync->syncBatch($batch);
            $synced += $result['synced'];
            $failed += $result['failed'];

            foreach ($result['errors'] as $code => $error) {
                $progress->clear();
                $this->newLine();
                $this->warn("PSGC {$code}: {$error}");
                $progress->display();
            }

            $progress->setMessage('PSGC '.array_key_last($batch));
            $progress->advance(count($batch));
        }

        $progress->setMessage('Complete');
        $progress->finish();
        $this->newLine(2);
        $this->components->info(
            "Barangay map sync complete: {$synced} synced, {$skipped} unchanged, {$failed} failed.",
        );

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
