<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing(['lgu:id,name', 'station:id,name']);

        return Inertia::render('profile/edit', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'profile_photo_url' => $user->profile_photo_path
                    ? Storage::disk('public')->url($user->profile_photo_path)
                    : null,
                'role' => $user->role->value,
                'lgu_name' => $user->lgu?->name,
                'station_name' => $user->station?->name,
            ],
        ]);
    }

    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $oldValues = $user->only(['name', 'email', 'phone', 'profile_photo_path']);
        $data = $request->safe()->only(['name', 'email', 'phone']);

        if ($request->hasFile('profile_photo')) {
            $newPath = $request->file('profile_photo')->store('profile-photos', 'public');

            if ($user->profile_photo_path) {
                Storage::disk('public')->delete($user->profile_photo_path);
            }

            $data['profile_photo_path'] = $newPath;
        }

        if ($data['email'] !== $user->email) {
            $data['email_verified_at'] = null;
        }

        $user->update($data);
        $this->audit($request, $user, 'profile.updated', $oldValues);

        Log::info('User profile updated.', ['user_id' => $user->id]);

        return back()->with('success', 'Your profile was updated successfully.');
    }

    public function updatePassword(UpdatePasswordRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->update(['password' => $request->string('password')->toString()]);

        $this->audit($request, $user, 'profile.password_updated');
        Log::info('User password updated.', ['user_id' => $user->id]);

        return back()->with('success', 'Your password was changed successfully.');
    }

    public function destroyPhoto(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->profile_photo_path) {
            $oldValues = ['profile_photo_path' => $user->profile_photo_path];
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
            $this->audit($request, $user, 'profile.photo_removed', $oldValues);
        }

        Log::info('User profile photo removed.', ['user_id' => $user->id]);

        return back()->with('success', 'Your profile photo was removed.');
    }

    /**
     * @param  array<string, mixed>|null  $oldValues
     */
    private function audit(
        Request $request,
        User $user,
        string $action,
        ?array $oldValues = null,
    ): void {
        AuditLog::query()->create([
            'user_id' => $user->id,
            'action' => $action,
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => $oldValues,
            'new_values' => $user->only(['name', 'email', 'phone', 'profile_photo_path']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
