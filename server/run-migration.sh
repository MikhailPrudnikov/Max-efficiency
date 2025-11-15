#!/bin/bash

# Script to run the database migrations
echo "Running database migrations..."

# Change to server directory
cd "$(dirname "$0")"

# Run the migration
npm run migrate

echo "Migration completed!"