<?php

use App\Models\Lgu;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot access profile management', function () {
    $this->get(route('profile.edit'))
        ->assertRedirect(route('login'));
});

test('authenticated user can view their profile', function () {
    $user = User::factory()->superAdmin()->create([
        'name' => 'System Administrator',
        'phone' => '09123456789',
    ]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('profile/edit')
            ->where('profile.name', 'System Administrator')
            ->where('profile.phone', '09123456789')
            ->where('profile.role', 'super_admin'));
});

test('user can update personal information without changing assignment', function () {
    $originalLgu = Lgu::query()->create(['name' => 'Original LGU']);
    $otherLgu = Lgu::query()->create(['name' => 'Other LGU']);
    $user = User::factory()->lguAdmin($originalLgu)->create([
        'email' => 'old@example.com',
    ]);

    $this->actingAs($user)
        ->put(route('profile.update'), [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'phone' => '09123456789',
            'role' => 'super_admin',
            'lgu_id' => $otherLgu->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $user->refresh();

    expect($user->name)->toBe('Updated Name')
        ->and($user->email)->toBe('updated@example.com')
        ->and($user->phone)->toBe('09123456789')
        ->and($user->role->value)->toBe('lgu_admin')
        ->and($user->lgu_id)->toBe($originalLgu->id);
});

test('profile validates phone and unique email', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create(['email' => 'mine@example.com']);

    $this->actingAs($user)
        ->put(route('profile.update'), [
            'name' => 'Valid Name',
            'email' => 'taken@example.com',
            'phone' => '12345',
        ])
        ->assertSessionHasErrors(['email', 'phone']);
});

test('user can upload and remove a profile photo', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.update'), [
            '_method' => 'PUT',
            'name' => $user->name,
            'email' => $user->email,
            'phone' => '',
            'profile_photo' => UploadedFile::fake()->image('avatar.jpg', 400, 400),
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $path = $user->refresh()->profile_photo_path;
    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);

    $this->actingAs($user)
        ->delete(route('profile.photo.destroy'))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($user->refresh()->profile_photo_path)->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

test('user must confirm current password before changing it', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $this->actingAs($user)
        ->put(route('profile.password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])
        ->assertSessionHasErrors('current_password');

    expect(Hash::check('old-password', $user->refresh()->password))->toBeTrue();
});

test('user can change their password', function () {
    $user = User::factory()->create(['password' => 'old-password']);

    $this->actingAs($user)
        ->put(route('profile.password.update'), [
            'current_password' => 'old-password',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(Hash::check('new-secure-password', $user->refresh()->password))
        ->toBeTrue();
});
