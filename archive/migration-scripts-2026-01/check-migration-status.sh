#!/bin/bash

echo "=========================================="
echo "MIGRATION FIX STATUS"
echo "=========================================="
echo ""

# Check Phase 1 progress
PHASE1_LOG="/tmp/claude/-Users-scottkaufman-Developer-StacksData2050/tasks/b1f3ce6.output"
if [ -f "$PHASE1_LOG" ]; then
  if grep -q "Fix complete!" "$PHASE1_LOG"; then
    echo "✅ Phase 1 (fix-all-answer-fks): COMPLETE"
    grep "Fix complete!" "$PHASE1_LOG" | tail -1 | sed 's/\x1b\[[0-9;]*m//g'
  else
    echo "⏳ Phase 1 (fix-all-answer-fks): IN PROGRESS"
    grep "Progress:" "$PHASE1_LOG" | tail -1 | sed 's/\x1b\[[0-9;]*m//g'
  fi
else
  echo "❓ Phase 1: No log found"
fi

echo ""

# Check automated pipeline
PIPELINE_LOG="/tmp/answers-final-run.log"
if [ -f "$PIPELINE_LOG" ]; then
  echo "--- Automated Pipeline Status ---"

  if grep -q "MIGRATION 100% COMPLETE" "$PIPELINE_LOG"; then
    echo "✅ ALL PHASES COMPLETE - MIGRATION READY!"
  elif grep -q "\[2/3\]" "$PIPELINE_LOG"; then
    echo "⏳ Phase 2 (questions and rows): IN PROGRESS"
  elif grep -q "\[3/3\]" "$PIPELINE_LOG"; then
    echo "⏳ Phase 3 (verification): IN PROGRESS"
  else
    echo "⏳ Waiting for Phase 1 to complete..."
  fi

  echo ""
  echo "Last 5 lines from pipeline:"
  tail -5 "$PIPELINE_LOG" | sed 's/\x1b\[[0-9;]*m//g'
fi

echo ""
echo "=========================================="
echo "Run this script again to check progress:"
echo "./check-migration-status.sh"
echo "=========================================="
