<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barangays', function (Blueprint $table) {
            $table->foreignId('captain_user_id')
                ->nullable()
                ->after('code')
                ->constrained('users')
                ->nullOnDelete();
            $table->unique('code');
            $table->index('captain_user_id');
        });

        Schema::table('stations', function (Blueprint $table) {
            $table->foreignId('chief_user_id')
                ->nullable()
                ->after('barangay_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('submitted_by_user_id')
                ->nullable()
                ->after('chief_user_id')
                ->constrained('users')
                ->nullOnDelete();
            // approved | pending | rejected
            $table->string('approval_status')
                ->default('approved')
                ->after('status')
                ->index();
            $table->index('chief_user_id');
            $table->index(['lgu_id', 'approval_status']);
        });
    }

    public function down(): void
    {
        Schema::table('stations', function (Blueprint $table) {
            $table->dropIndex(['lgu_id', 'approval_status']);
            $table->dropConstrainedForeignId('submitted_by_user_id');
            $table->dropConstrainedForeignId('chief_user_id');
            $table->dropColumn('approval_status');
        });

        Schema::table('barangays', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropConstrainedForeignId('captain_user_id');
        });
    }
};
