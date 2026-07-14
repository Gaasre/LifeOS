# People, Households, and Computed Perspectives

## Persisted model

LifeOS persists one household boundary and canonical data inside it:

- Better Auth `organization` and `member`: account-to-household membership.
- `people`: real people, optionally linked to login accounts.
- `entities`: canonical notes, tasks, documents, events, and future life
  objects, each scoped to one household.
- `entity_people`: where an entity appears by person.
- `entity_modules`: where an entity appears by module.
- `person_facts`: keyed useful facts and user-defined personal fields.
- `official_records`: structured records with optional source-document links.
- `personal_dates`: additional renewals and recurring personal dates that are
  not derived from the profile or official records.
- `documents` and `file_objects`: document metadata and stored file objects.

There is no persisted `spaces` table.

## Computed views

- Person: household entities joined through `entity_people.person_id`.
- Family: all relevant entities in the household, including person-linked and
  household-level entities.
- Module: household entities joined through `entity_modules.module`.
- Documents: the same canonical document library filtered by the active Person
  or Family perspective. A Person shows documents linked through
  `entity_people`; Family shows every household document.

A view context may supply creation defaults, but it never selects a storage
container or changes access.

`entities.created_by_user_id` records who added an item. It is provenance, not
a person relationship: it can be displayed or filtered as “Added by,” but it
does not decide which Person perspective contains the item. New uploads default
to the active person, falling back to the signed-in person's record from the
Family perspective, and the user can adjust People and Modules before storage.

## Authorization

Every entity carries `organization_id`. A request may operate on it when the
signed-in user has a matching `member` row. All members receive the same read
and write capabilities for household entities.

Better Auth retains internal organization role names because its membership
lifecycle requires them; LifeOS configures the supported names identically and
does not expose or consult them for domain access.

## Files

Object keys use `v1/<organization-id>/<entity-id>/<file-id>`. Existing object
keys remain valid because reads use the stored key. A person or module relation
never creates another file object.
