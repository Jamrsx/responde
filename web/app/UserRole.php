<?php

namespace App;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case LguAdmin = 'lgu_admin';
    case BarangayCaptain = 'barangay_captain';
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
            self::BarangayCaptain, self::Staff, self::Civilian => null,
        };
    }

    public function homeRouteName(): string
    {
        return match ($this) {
            self::SuperAdmin => 'admin.dashboard',
            self::LguAdmin => 'lgu.dashboard',
            self::BarangayCaptain => 'captain.dashboard',
            self::Chief => 'chief.dashboard',
            default => 'home',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::LguAdmin => 'LGU Admin',
            self::BarangayCaptain => 'Barangay Captain',
            self::Chief => 'Station Chief',
            self::Staff => 'Response Staff',
            self::Civilian => 'Civilian',
        };
    }
}
