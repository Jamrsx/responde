<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * station_type_id / barangay_id FKs are added after lookup tables exist.
     */
    public function up(): void
    {
        Schema::create('stations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lgu_id')->constrained('lgus')->cascadeOnDelete();
            $table->unsignedBigInteger('station_type_id')->index();
            $table->string('icon_key')->default('generic');
            $table->string('logo_path')->nullable();
            $table->unsignedBigInteger('barangay_id')->nullable()->index();
            $table->string('name');
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('proposed_latitude', 10, 7)->nullable();
            $table->decimal('proposed_longitude', 10, 7)->nullable();
            // pending | approved | rejected
            $table->string('location_update_status')->nullable()->index();
            $table->text('location_update_note')->nullable();
            $table->text('location_update_review_note')->nullable();
            $table->timestamp('location_update_requested_at')->nullable();
            $table->timestamp('location_update_reviewed_at')->nullable();
            // active | inactive | busy
            $table->string('status')->default('active')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['latitude', 'longitude']);
            $table->index(['lgu_id', 'station_type_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stations');
    }
};
