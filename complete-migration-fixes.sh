#!/bin/bash

set -e

echo "=================================================="
echo "COMPREHENSIVE MIGRATION FIX - AUTOMATED PIPELINE"
echo "=================================================="
echo ""

LOG_DIR="/tmp/answers-final-run.log"

# Step 1: Wait for first fix to complete if running
echo "[1/3] Monitoring fix-all-answer-fks.ts progress..."
FIRST_FIX_LOG="/tmp/claude/-Users-scottkaufman-Developer-StacksData2050/tasks/b1f3ce6.output"

if [ -f "$FIRST_FIX_LOG" ]; then
  if grep -q "Fix complete!" "$FIRST_FIX_LOG"; then
    echo "✅ First fix already complete!"
    grep "Fix complete!" "$FIRST_FIX_LOG" | tail -1
  else
    echo "Waiting for fix-all-answer-fks.ts to complete..."
    while ! grep -q "Fix complete!" "$FIRST_FIX_LOG" 2>/dev/null; do
      PROGRESS=$(grep "Progress:" "$FIRST_FIX_LOG" 2>/dev/null | tail -1 || echo "Starting...")
      echo -ne "\r$PROGRESS"
      sleep 5
    done
    echo ""
    echo "✅ First fix complete!"
    grep "Fix complete!" "$FIRST_FIX_LOG" | tail -1
  fi
fi

echo ""

# Step 2: Run second fix for questions and list table rows
echo "[2/3] Running fix-answer-questions-and-rows.ts..."
cd /Users/scottkaufman/Developer/StacksData2050/stacks
npx tsx src/migration/fix-answer-questions-and-rows.ts 2>&1 | tee -a "$LOG_DIR"

if [ $? -eq 0 ]; then
  echo "✅ Second fix complete!"
else
  echo "❌ Second fix failed!"
  exit 1
fi

echo ""

# Step 3: Run final verification
echo "[3/3] Running final verification..."
npx tsx src/migration/final-verification.ts 2>&1 | tee -a "$LOG_DIR"

if grep -q "MIGRATION VERIFICATION PASSED" "$LOG_DIR"; then
  echo ""
  echo "=================================================="
  echo "✅ MIGRATION 100% COMPLETE - READY FOR APP BUILD"
  echo "=================================================="
  exit 0
else
  echo ""
  echo "=================================================="
  echo "❌ MIGRATION VERIFICATION FAILED - REVIEW NEEDED"
  echo "=================================================="
  exit 1
fi
