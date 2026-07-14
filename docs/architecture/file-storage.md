# Private File and Document Storage

LifeOS stores file metadata in Postgres and file bytes in a private object
store. `packages/storage` supplies the provider adapter and currently uses
Cloudflare R2; `packages/files` owns the storage-independent upload, verify,
download, delete, and audit workflow. Product modules should depend on the
file service rather than an R2 client.

Every file belongs to a canonical household-scoped `entities` row. The key
shape is `v1/<organization-id>/<entity-id>/<file-id>`. A document is a
one-to-one extension of an entity, with exactly one `original` file object;
there is intentionally no document-version table or replacement history.
Generated previews use the deterministic key
`v1/<organization-id>/<entity-id>/derived/preview/<source-file-id>` so a
retried job can safely overwrite and adopt the same object.

Access is evaluated against the entity's household, never directly against a
bucket key. Any signed-in account with a matching household membership can
manage the entity. Person and module relationships only control where the
document appears. After the membership check, the API issues a short-lived
signed R2 URL; R2 remains private and has no public object URL.

The upload flow creates a pending file row and audit event, returns a signed
PUT URL, then verifies the R2 object with a server-side HEAD request before
marking it ready. Downloads and deletion use the same entity authorization
path. Pending uploads can be identified by `file_objects.status` and
`upload_expires_at` for future cleanup automation.

Images use their original object as their visual preview. When a PDF upload is
verified, the API marks the original ready and inserts a pg-boss job in the
same Postgres transaction. The upload request then returns without waiting for
rendering. `apps/worker` claims the job, `packages/document-previews` renders
the first page locally (with no AI or external processing), and
`packages/files` stores the resulting private PNG in R2 as the document's
`preview` file object.

Preview state is explicit on the document as `pending`, `ready`, or `failed`.
The worker retries transient failures with exponential backoff, moves exhausted
jobs to a dead-letter queue that marks the document failed, and reconciles
orphaned pending uploads when it starts. Rendering and storage are idempotent:
an already-ready preview is reused after a crash. Work is processed one PDF at
a time per worker process to bound native canvas memory and CPU use.

The web app only requests a preview when its card is near the viewport. While
the status is pending it polls the membership-checked preview endpoint; once
ready, the endpoint returns a short-lived inline URL for either the image
original or generated PDF preview. Neither kind has a public bucket URL.

pg-boss owns and migrates its `pgboss` schema in the existing LifeOS Postgres
database. That schema is deliberately outside Drizzle migration ownership;
all LifeOS-owned tables remain defined and migrated through `packages/db`.

For direct browser uploads, configure the R2 bucket CORS policy from
`tooling/r2/cors.development.json`, then add the production web origin. CORS
origins must match the browser origin exactly: `http://127.0.0.1:5173` and
`http://localhost:5173` are different origins. Keep `R2_ENDPOINT`,
`R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` only in the
API and worker environments.
