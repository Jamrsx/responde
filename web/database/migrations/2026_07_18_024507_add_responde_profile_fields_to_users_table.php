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
        Schema::table('users', function (Blueprint $table) {
            // super_admin | lgu_admin | chief | staff | civilian
            $table->string('role')->default('civilian')->after('email')->index();
            $table->string('phone')->nullable()->after('role');
            $table->string('profile_photo_path')->nullable()->after('phone');
            $table->foreignId('lgu_id')->nullable()->after('profile_photo_path')->constrained('lgus')->nullOnDelete();
            $table->foreignId('station_id')->nullable()->after('lgu_id')->constrained('stations')->nullOnDelete();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropConstrainedForeignId('station_id');
            $table->dropConstrainedForeignId('lgu_id');
            $table->dropColumn(['role', 'phone', 'profile_photo_path']);
        });
    }
};
