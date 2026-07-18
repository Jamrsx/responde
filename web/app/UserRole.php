<?php

namespace App;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case LguAdmin = 'lgu_admin';
    case Chief = 'chief';
    case Staff = 'staff';
    case Civilian = 'civilian';

    public function canCreateAccounts(): bool
    {
        return in_array($this, [
            self::SuperAdmin,
            self::LguAdmin,
            self::Chief,
        ], true);
    }

    public function managedRole(): ?self
    {
        return match ($this) {
            self::SuperAdmin => self::LguAdmin,
            self::LguAdmin => self::Chief,
            self::Chief => self::Staff,
            self::Staff, self::Civilian => null,
        };
    }
}
