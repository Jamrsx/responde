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
        Schema::create('responder_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('responder_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('emergency_id')->nullable()->constrained('emergencies')->nullOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('accuracy_meters', 8, 2)->nullable();
            $table->timestamp('recorded_at')->index();
            $table->timestamps();

            $table->index(['responder_user_id', 'recorded_at']);
            $table->index(['latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('responder_locations');
    }
};
