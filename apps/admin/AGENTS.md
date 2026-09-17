# Admin Agent Rules

The admin app is TanStack Start/Router/Query. Before changing server functions,
loaders, query options, route error components, auth policy, or observability,
read the repository
[`docs/ERROR_HANDLING_CONVENTION.md`](../../docs/ERROR_HANDLING_CONVENTION.md).

Generated code MUST preserve the shared error taxonomy, report unexpected errors
once at the server boundary, avoid duplicate Query/Router reporting, use safe
messages, and retry only when the classified operation is safe and retryable.
