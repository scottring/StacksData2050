#!/bin/bash

# Extract project ref from SUPABASE_URL
source .env
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/.*\/\/\(.*\)\.supabase.co.*/\1/')

echo "Project Reference: $PROJECT_REF"
echo ""
echo "To check RLS policies, you need to connect via psql."
echo "Run this command in your terminal (you'll need the database password):"
echo ""
echo "psql -h db.$PROJECT_REF.supabase.co -p 5432 -d postgres -U postgres -f check-rls.sql"
echo ""
echo "Or run the SQL commands in the Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/sql"
