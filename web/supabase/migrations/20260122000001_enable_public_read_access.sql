-- Enable public read access for choices and answers tables
-- This allows the frontend (using anon key) to read data

-- Choices table: Allow public SELECT
DROP POLICY IF EXISTS "Enable read access for all users" ON choices;

CREATE POLICY "Enable read access for all users"
ON choices
FOR SELECT
USING (true);

-- Answers table: Allow public SELECT
-- Keep the existing restrictive policies for INSERT/UPDATE/DELETE
-- But allow anyone to read answers (frontend needs this)
DROP POLICY IF EXISTS "Enable read access for all users" ON answers;

CREATE POLICY "Enable read access for all users"
ON answers
FOR SELECT
USING (true);

-- Questions table: Ensure public can read questions too
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;

CREATE POLICY "Enable read access for all users"
ON questions
FOR SELECT
USING (true);

-- Sheets table: Ensure public can read sheets
DROP POLICY IF EXISTS "Enable read access for all users" ON sheets;

CREATE POLICY "Enable read access for all users"
ON sheets
FOR SELECT
USING (true);
