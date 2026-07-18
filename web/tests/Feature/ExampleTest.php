<?php

use App\Models\User;

test('returns a successful response', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $response = $this->get(route('home'));

    $response->assertRedirect(route('admin.dashboard'));
});

test('non super admin can view the home page', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('home'))->assertOk();
});
