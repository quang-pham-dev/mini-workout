# Mini Workout transport contracts

This package owns versioned wire contracts shared by independent runtimes. It
is intentionally narrow: domain models stay in `packages/core`, generated
persistence types stay in `packages/database`, and Landing rendering/view-model
contracts stay in `apps/landing`.

`@mini-workout/contracts` currently exports `LandingSnapshotV1`, its Zod schema
and parser. Strapi validates the complete envelope before responding; Astro
validates the same envelope before applying its stricter SEO, media, slug,
internal-link and rendering rules.

It also exports `LandingMigrationManifestV1`. This is an offline,
provider-neutral handoff format for deterministic migration planning; it does
not expose Strapi IDs or Sanity document IDs as route identity.

Changing an existing schema incompatibly is forbidden. Add a new version and a
deliberate producer/consumer migration instead.
