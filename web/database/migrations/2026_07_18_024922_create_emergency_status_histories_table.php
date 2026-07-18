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
        Schema::create('emergency_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('emergency_id')->constrained('emergencies')->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['emergency_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergency_status_histories');
    }
};
