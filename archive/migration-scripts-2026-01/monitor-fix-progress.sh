#!/bin/bash

# Monitor the fix-all-answer-fks progress
LOG_FILE="/tmp/claude/-Users-scottkaufman-Developer-StacksData2050/tasks/b1f3ce6.output"

echo "Monitoring FK fix progress..."
echo "Press Ctrl+C to stop monitoring"
echo ""

while true; do
  # Get the last progress line
  LAST_PROGRESS=$(grep "Progress:" "$LOG_FILE" | tail -1)

  if [[ -n "$LAST_PROGRESS" ]]; then
    echo -ne "\r$LAST_PROGRESS"
  fi

  # Check if completed
  if grep -q "Fix complete!" "$LOG_FILE"; then
    echo ""
    echo ""
    echo "=== FIX COMPLETED ==="
    grep "Fix complete!" "$LOG_FILE" | tail -1
    exit 0
  fi

  sleep 5
done
