<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lgu_barangay_maps', function (Blueprint $table): void {
            $table->id();
            $table->string('psgc_code', 20)->unique();
            $table->unsignedSmallInteger('barangay_count')->default(0);
            $table->longText('geojson');
            $table->string('source_hash', 64)->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lgu_barangay_maps');
    }
};
