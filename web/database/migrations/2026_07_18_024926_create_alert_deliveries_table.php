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
        Schema::create('alert_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_id')->constrained('emergencies')->cascadeOnDelete();
            $table->foreignId('station_id')->nullable()->constrained('stations')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('emergency_assignment_id')->nullable()->constrained('emergency_assignments')->nullOnDelete();
            // push | database | sms
            $table->string('channel')->index();
            // pending | sent | failed | read
            $table->string('status')->default('pending')->index();
            $table->text('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['emergency_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alert_deliveries');
    }
};
