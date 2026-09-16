# Markets are named as markets, not after their publisher

The Market discriminator is `parallel | official`, not `parallel | cbn`. The institution that publishes a Rate is recorded in its Source label instead, where it can change without a data migration.

## Why this is not obvious

Every other Nigerian rate product calls the official figure "the CBN rate", so a future reader will reasonably wonder why this codebase does not. The reason is that the publisher has already changed twice in recent years: the Investors & Exporters window became NAFEM in October 2023, which became NFEM under the EFEMS matching system on 1 December 2024. Each time, the *market* persisted and the *publisher and mechanism* changed.

`market` is a Postgres enum baked into stored rows, so renaming it later means a migration over the whole rates history. `source_label` is per row and changes for free.

## Consequences

The UI says "Official" where users might expect "CBN". Attribution is not lost by this: the CBN's licence requires its material be credited, and that credit appears on every Rate's Source label and on the About screen — attached to the rows that actually came from the CBN, rather than baked into a category name that may outlive the institution.
