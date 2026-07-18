<?php

use App\Models\User;

test('returns a successful response', function () {
    $this->actingAs(User::factory()->superAdmin()->create());

    $response = $this->get(route('home'));

    $response->assertOk();
});