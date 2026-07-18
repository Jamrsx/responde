<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('map_assets', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 100)->unique();
            $table->unsignedInteger('feature_count')->default(0);
            $table->longText('geojson');
            $table->string('source_hash', 64)->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_assets');
    }
};
