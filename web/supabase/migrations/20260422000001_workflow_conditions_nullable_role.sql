-- workflow_conditions.role should be nullable.
--
-- Some conditions are added by users who hold no named plant role
-- (e.g. a super-admin clarifying an entry, or a tenant admin adding
-- context). The original migration declared role NOT NULL, which
-- forced the API to either reject those users or invent a fake role.
--
-- Nullable is the honest state: "role" is the pipeline role under
-- which the condition was added, when applicable.

ALTER TABLE workflow_conditions
  ALTER COLUMN role DROP NOT NULL;
