<?php

use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are directed to the login page', function () {
    $this->get(route('home'))->assertRedirect(route('login'));
});

test('login page is displayed', function () {
    $this->get(route('login'))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page->component('auth/login'));
});

test('user can authenticate with valid credentials', function () {
    $user = User::factory()->superAdmin()->create([
        'email' => 'sadmin@gmail.com',
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
        'remember' => true,
    ])->assertRedirect(route('home', absolute: false));

    $this->assertAuthenticatedAs($user);
    $this->assertDatabaseHas(LoginAttempt::class, [
        'user_id' => $user->id,
        'successful' => true,
        'guard' => 'web',
    ]);
});

test('user cannot authenticate with an invalid password', function () {
    $user = User::factory()->superAdmin()->create();

    $this->from(route('login'))
        ->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'incorrect-password',
        ])
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('email');

    $this->assertGuest();
    $this->assertDatabaseHas(LoginAttempt::class, [
        'user_id' => $user->id,
        'successful' => false,
    ]);
});

test('login attempts are rate limited', function () {
    $email = 'limited@example.com';
    $throttleKey = Str::transliterate(Str::lower($email).'|127.0.0.1');

    RateLimiter::clear($throttleKey);

    foreach (range(1, 5) as $attempt) {
        $this->post(route('login.store'), [
            'email' => $email,
            'password' => "wrong-password-{$attempt}",
        ])->assertSessionHasErrors('email');
    }

    $response = $this->post(route('login.store'), [
        'email' => $email,
        'password' => 'wrong-password',
    ]);

    $response->assertSessionHasErrors('email');

    expect(session('errors')->first('email'))
        ->toContain('Too many login attempts.');
});

test('authenticated user can log out', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user)
        ->post(route('logout'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});
