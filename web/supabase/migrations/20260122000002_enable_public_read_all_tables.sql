-- Enable public read access for all remaining tables needed by frontend
-- This allows the frontend (using anon key) to read all necessary data

-- Sections table
DROP POLICY IF EXISTS "Enable read access for all users" ON sections;

CREATE POLICY "Enable read access for all users"
ON sections
FOR SELECT
USING (true);

-- Subsections table
DROP POLICY IF EXISTS "Enable read access for all users" ON subsections;

CREATE POLICY "Enable read access for all users"
ON subsections
FOR SELECT
USING (true);

-- Tags table
DROP POLICY IF EXISTS "Enable read access for all users" ON tags;

CREATE POLICY "Enable read access for all users"
ON tags
FOR SELECT
USING (true);

-- Question tags table (many-to-many)
DROP POLICY IF EXISTS "Enable read access for all users" ON question_tags;

CREATE POLICY "Enable read access for all users"
ON question_tags
FOR SELECT
USING (true);

-- Sheet tags table (many-to-many)
DROP POLICY IF EXISTS "Enable read access for all users" ON sheet_tags;

CREATE POLICY "Enable read access for all users"
ON sheet_tags
FOR SELECT
USING (true);

-- List table columns
DROP POLICY IF EXISTS "Enable read access for all users" ON list_table_columns;

CREATE POLICY "Enable read access for all users"
ON list_table_columns
FOR SELECT
USING (true);

-- List table rows
DROP POLICY IF EXISTS "Enable read access for all users" ON list_table_rows;

CREATE POLICY "Enable read access for all users"
ON list_table_rows
FOR SELECT
USING (true);

-- Companies table
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;

CREATE POLICY "Enable read access for all users"
ON companies
FOR SELECT
USING (true);

-- Users table
DROP POLICY IF EXISTS "Enable read access for all users" ON users;

CREATE POLICY "Enable read access for all users"
ON users
FOR SELECT
USING (true);

-- Sheet statuses table
DROP POLICY IF EXISTS "Enable read access for all users" ON sheet_statuses;

CREATE POLICY "Enable read access for all users"
ON sheet_statuses
FOR SELECT
USING (true);

-- Answer rejections table
DROP POLICY IF EXISTS "Enable read access for all users" ON answer_rejections;

CREATE POLICY "Enable read access for all users"
ON answer_rejections
FOR SELECT
USING (true);
