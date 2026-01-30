-- ============================================
-- QUESTION COMMENTS & ECOLABELS NOTES
-- January 30, 2026
--
-- 1. Add additional_notes to answers for Ecolabels optional comments
-- 2. Create question_comments table for threaded discussions
-- ============================================

-- Step 1: Add additional_notes column to answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'answers' AND column_name = 'additional_notes'
  ) THEN
    ALTER TABLE answers ADD COLUMN additional_notes TEXT DEFAULT NULL;
    RAISE NOTICE 'Added additional_notes column to answers';
  ELSE
    RAISE NOTICE 'additional_notes column already exists';
  END IF;
END $$;

-- Step 2: Create question_comments table
CREATE TABLE IF NOT EXISTS question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_question_comments_sheet_question
  ON question_comments(sheet_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_comments_user
  ON question_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_question_comments_created
  ON question_comments(created_at DESC);

-- Step 3: Enable RLS
ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies
-- Users can read comments on sheets where their company is involved
-- (either as the sheet owner or the request sender)
CREATE POLICY "Users can read comments on their sheets"
  ON question_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sheets s
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = question_comments.sheet_id
      AND (
        -- User's company owns the sheet
        s.company_id = u.company_id
        OR
        -- User's company sent a request for this sheet
        EXISTS (
          SELECT 1 FROM requests r
          WHERE r.sheet_id = s.id
          AND r.sender_id IN (
            SELECT u2.id FROM users u2 WHERE u2.company_id = u.company_id
          )
        )
      )
    )
  );

-- Users can create comments on sheets they're actively working on
CREATE POLICY "Users can create comments on their sheets"
  ON question_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM sheets s
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = question_comments.sheet_id
      AND (
        -- User's company owns the sheet
        s.company_id = u.company_id
        OR
        -- User's company sent a request for this sheet
        EXISTS (
          SELECT 1 FROM requests r
          WHERE r.sheet_id = s.id
          AND r.sender_id IN (
            SELECT u2.id FROM users u2 WHERE u2.company_id = u.company_id
          )
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON question_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON question_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_question_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_question_comments_updated_at ON question_comments;
CREATE TRIGGER trigger_question_comments_updated_at
  BEFORE UPDATE ON question_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_question_comments_updated_at();

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '- additional_notes column added to answers';
  RAISE NOTICE '- question_comments table created with RLS policies';
END $$;
