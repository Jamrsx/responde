<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stations', function (Blueprint $table) {
            $table->foreign('station_type_id')
                ->references('id')
                ->on('station_types')
                ->restrictOnDelete();

            $table->foreign('barangay_id')
                ->references('id')
                ->on('barangays')
                ->nullOnDelete();
        });

        Schema::table('emergencies', function (Blueprint $table) {
            $table->foreign('emergency_type_id')
                ->references('id')
                ->on('emergency_types')
                ->nullOnDelete();

            $table->foreign('barangay_id')
                ->references('id')
                ->on('barangays')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('emergencies', function (Blueprint $table) {
            $table->dropForeign(['emergency_type_id']);
            $table->dropForeign(['barangay_id']);
        });

        Schema::table('stations', function (Blueprint $table) {
            $table->dropForeign(['station_type_id']);
            $table->dropForeign(['barangay_id']);
        });
    }
};
