# Responde Auth Decision — No KYC (For Now)

## Decision

Civilian identity verification (KYC) is **not required** in the current version of Responde.

- No government-issued ID upload
- No OCR identity matching
- No LGU admin ID review for civilians
- Anyone can register and use the app, including SOS

## Civilian Profile Photo

Instead of KYC, civilians will capture a **face scan / selfie**.

- That image becomes their **profile picture**
- It is for profile display only
- It is **not** used as government identity verification

## Why This Approach

- Faster onboarding so the public can use Responde quickly in emergencies
- Fully free and Hostinger-friendly (no KYC vendor, no OCR server, no Docker KYC engine)
- Keeps the first version simpler to build and deploy

## Future Option

KYC can be added later if needed (for example: ID upload, OCR compare, LGU manual review, or a self-hosted/cloud KYC service) without changing the core emergency-response design.

If KYC is reintroduced later, it should be documented in a new auth/KYC plan file and treated as an upgrade path, not as a requirement for the current MVP.

## Related Abuse Controls (Optional Later)

Without KYC, spam or fake SOS is easier. Possible later controls (not required for this decision):

- SOS rate limiting
- Ability to cancel an SOS
- Admin ability to block abusive users

## Status

**Locked for now:** No KYC. Face capture = profile picture only.
