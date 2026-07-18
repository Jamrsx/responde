<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * emergency_type_id FK is added after emergency_types exists.
     */
    public function up(): void
    {
        Schema::create('emergencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('civilian_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('lgu_id')->nullable()->constrained('lgus')->nullOnDelete();
            $table->unsignedBigInteger('barangay_id')->nullable()->index();
            $table->unsignedBigInteger('emergency_type_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('address_text')->nullable();
            // pending | assigned | en_route | resolved | cancelled
            $table->string('status')->default('pending')->index();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['latitude', 'longitude']);
            $table->index(['status', 'created_at']);
            $table->index(['lgu_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emergencies');
    }
};
