# Person (“Me”) Module

## Product rule

“Me” is the signed-in account’s person view. The same screen can open any
other person in the household, such as a partner.

Person and Family spaces are computed perspectives. They are not folders,
storage containers, ownership boundaries, or permission systems. Every
household member can read and manage all household data.

## Routes

- `/me` resolves the signed-in account to its linked person.
- `/people/:personId` opens any person in the same household.
- `/family` combines the household’s people and related entities.

Changing routes changes filtering and creation defaults only.

## Module structure

1. Overview
2. Official information
3. Useful personal facts
4. Important dates

Notes, tasks, reminders, and timeline events remain owned by their modules and
will appear here through person relationships when those modules are built.

### Overview

Keep this compact: photo, legal and preferred names, date and place of birth,
nationality, current city and address, marital status, and languages. These are
first-class fields on `people`; the overview is not an account settings page or
a metric dashboard.

### Official information

`official_records` stores structured passport, national ID, residence permit,
tax, social security, health insurance, consular registration, and driver’s
licence data. A record may link to a source document entity. The original file
remains stored once in Documents.

### Useful personal facts

`person_facts` stores reusable values such as height, sizes, food restrictions,
preferred language and currency, home airport, style, and travel preferences.
Known fields have stable keys and people can add custom fields without defining
a schema. Facts are structured values, not notes or journal entries.

### Important dates

Birthday and official-record expiries are computed from their source fields.
`personal_dates` stores only additional renewals or recurring personal dates so
the module does not duplicate information.

### Source documents

Source-document links render as secondary references back to the central vault.
Selecting a source also adds the document’s `entity_people` relationship so it
appears in that person perspective. It never stores or displays a second copy.

## Access model

Authentication answers who is signed in. Household membership answers which
household they may access. That is the complete domain authorization model.

LifeOS does not implement:

- private/shared item states;
- per-field or per-document audiences;
- viewer/editor/manager grants;
- owner/organizer/member/guest product roles;
- share expiry or sharing confirmation flows;
- creator-owned edit restrictions.

`created_by_user_id` is provenance only. It never changes access.

## Contextual creation

- A person view defaults a new entity’s `entity_people` relationship to that
  person.
- Family view may default relationships to both people when appropriate.
- Global creation may leave person relationships empty until the user or local
  extraction assigns them.

Relationships are always editable and never affect access.

## Acceptance criteria

- Either household member can open and edit either person.
- `/me` and `/people/:personId` use the same data and UI.
- The UI has exactly four sections: Overview, Official information, Useful
  personal facts, and Important dates.
- A source document is stored once and referenced from official records.
- Birthday and record expiry dates appear automatically; custom renewals can be
  added separately.
- No person or record UI contains visibility, role, owner, or audience controls.
- Family automatically includes household entities without a share action.
