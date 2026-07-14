# Projects Module

## Product rule

Projects turn a life outcome into one ordered path and one clear next action.
They are not task backlogs, boards, or productivity dashboards.

The next action is always derived from the first incomplete top-level step.
Substeps are preparation for one stage and never enter a separate global task
list.

## Perspectives and access

A project is a canonical household entity. `entity_people` and
`entity_modules` decide which computed perspectives include it:

- Family includes every household project.
- A person perspective includes projects related to that person.
- Creating from a person perspective suggests that person by default.

These relationships are filters only. Household membership remains the sole
access boundary, so every household member can open and manage every project.

## Data ownership

- `projects` stores project-specific outcome, context, status, and optional
  cover information for an `entities` row.
- `project_steps` stores the ordered path and one level of preparation
  substeps.
- `project_documents` and `project_step_documents` link existing Document
  entities. Files remain stored once in Documents.
- `project_related_entities` links optional canonical LifeOS entities without
  copying their data.

Exactly one incomplete top-level step is marked active. Completing a top-level
step marks it complete, advances that marker, updates progress, and completes
the project when no incomplete stage remains.

## Main experience

The screen has two calm regions:

1. A compact list of projects with outcome, next action, and path progress.
2. A focused project view containing the next step, its preparation items,
   required documents, and the horizontal path.

Creation, editing, reordering, pausing, and project-wide attachments live in
the project menu or the Actions command palette so they do not compete with the
next action.

## Non-goals

Projects does not implement priorities, assignees, permissions, sprints,
kanban, time tracking, estimates, productivity scores, or a second task
backlog.
