#!/bin/bash
# Post-build script to clean up pip cache and reduce disk usage
echo "Cleaning up pip cache..."
pip cache purge || true

echo "Removing unnecessary files..."
# Remove test files and documentation if present
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true

echo "Disk usage after cleanup:"
df -h
