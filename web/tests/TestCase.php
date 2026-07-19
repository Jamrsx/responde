<?php

namespace Tests;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Databases the test suite must NEVER touch. RefreshDatabase runs
     * `migrate:fresh`, which drops every table, so pointing tests at a real
     * database would wipe it.
     *
     * @var list<string>
     */
    protected array $protectedDatabases = ['responde'];

    /**
     * Boot the app for each test, then refuse to continue unless the database
     * is a dedicated test database.
     *
     * This runs before RefreshDatabase migrates, so it prevents tests from ever
     * wiping the real development database (e.g. when config is cached and
     * phpunit.xml's overrides are ignored).
     */
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        $default = config('database.default');
        $driver = config("database.connections.{$default}.driver");
        $database = (string) config("database.connections.{$default}.database");

        $isMemorySqlite = $driver === 'sqlite'
            && in_array($database, [':memory:', ''], true);

        $isDedicatedTestDb = str_ends_with($database, '_testing')
            && ! in_array($database, $this->protectedDatabases, true);

        if (! $isMemorySqlite && ! $isDedicatedTestDb) {
            throw new RuntimeException(
                'Refusing to run tests against a non-test database. Tests must '
                .'use an in-memory SQLite connection or a database whose name '
                ."ends with \"_testing\", but the resolved database is "
                ."[{$database}] on connection [{$default}]. This safety check "
                .'prevents wiping your real data. Run `php artisan config:clear` '
                .'and confirm phpunit.xml is being used.'
            );
        }

        return $app;
    }
}
