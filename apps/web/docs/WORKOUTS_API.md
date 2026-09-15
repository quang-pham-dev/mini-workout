# Workout interactions API v1

`PUT /api/v1/workouts/{id}/like` sets the current user's like to `true`.
`DELETE /api/v1/workouts/{id}/like` sets it to `false`. Both methods are
idempotent for repeated requests with the same authenticated user and workout.

The endpoint currently authenticates a Better Auth session from the request
headers. Mobile clients must maintain that session cookie from the existing
sign-in flow. Bearer tokens and cross-origin browser access are not configured.
The client never supplies `userId`; it is derived from the session.

Successful responses use status `200`:

```json
{ "workoutSlug": "full-body-flow", "liked": true }
```

Errors use `{ "error": "..." }`: `401` for no session, `400` for an invalid
workout ID or input, and `404` when the workout does not exist or is not
published. Responses set `Cache-Control: no-store`. Unexpected server errors
are not exposed to clients as database details.

The write path uses the unique `(userId, workoutId)` key with conflict-safe
insertion and deletion. Deploy a shared edge/API rate limit before exposing
this endpoint to high-volume public traffic; an in-process limiter would not
coordinate across serverless instances.
