# `@mini-workout/feature-flags`

Framework- and provider-neutral feature-flag contracts for Mini Workout.

Stable application keys and their owner/review metadata live in
`FEATURE_FLAG_REGISTRY`. Feature code must not use provider keys. Local and CI
flows use the deterministic local provider; production provider adapters live
in `@mini-workout/analytics`.

`auth.emailVerification` defaults to `false`. The local environment override
accepts only `MW_FEATURE_AUTH_EMAIL_VERIFICATION=0|1`; malformed values fail
configuration instead of silently enabling authentication behavior.
