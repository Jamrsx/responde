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
        Schema::create('emergency_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_id')->constrained('emergencies')->cascadeOnDelete();
            $table->foreignId('station_id')->constrained('stations')->restrictOnDelete();
            $table->foreignId('responder_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Snapshot at ping time for history (controlled denormalization)
            $table->decimal('distance_km', 8, 3)->nullable();
            // notified | accepted | declined | en_route | completed
            $table->string('status')->default('notified')->index();
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedTinyInteger('public_rating')->nullable();
            $table->text('public_feedback')->nullable();
            $table->timestamp('rated_at')->nullable();
            $table->timestamps();

            $table->unique(['emergency_id', 'station_id']);
            $table->index(['station_id', 'status']);
            $table->index(['responder_user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_assignments');
    }
};
