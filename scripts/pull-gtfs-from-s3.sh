#!/bin/bash
# Pull new current.* GTFS filesfrom S3 bucket into Lightsail.

# Fails script if: exit on error, unset variables, pipefail
set -euo pipefail

AWS=/home/ubuntu/.local/bin/aws
BUCKET=ridendine-gtfs
PREFIX=gtfs
DEST=/var/lib/ridendine/gtfs
STAGING=/tmp/gtfs-incoming

rm -rf "$STAGING"
mkdir -p "$STAGING" "$DEST"

# Sync (pull) current.* files from S3 to staging dir
"$AWS" s3 sync "s3://${BUCKET}/${PREFIX}/" "$STAGING/"

updated=0
skipped=0

# loop thru the dir (e.g translink) in the staging dir
for dir in "$STAGING"/*
do
    [ -d "$dir" ] || continue
    id=$(basename "$dir")

    if [ ! -f "$dir/current.json" ] || [ ! -f "$dir/current.zip" ]
    then
        echo "skip $id (incomplete)"
        skipped=$((skipped + 1))
        continue
    fi

    mkdir -p "$DEST/$id"

    # Rename current.* to previous.*
    [ -f "$DEST/$id/current.json" ] && mv -f "$DEST/$id/current.json" "$DEST/$id/previous.json"
    [ -f "$DEST/$id/current.zip" ] && mv -f "$DEST/$id/current.zip" "$DEST/$id/previous.zip"

    # Move new current.* from staging to production dir
    mv -f "$dir/current.json" "$DEST/$id/current.json"
    mv -f "$dir/current.zip" "$DEST/$id/current.zip"
    echo "updated $id"
    updated=$((updated + 1))
done

rm -rf "$STAGING"

if [ "$skipped" -eq 0 ]; then
    echo "All $updated passed"
else
    echo "$updated passed, $skipped failed"
    exit 1
fi