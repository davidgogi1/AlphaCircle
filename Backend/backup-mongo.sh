#!/bin/bash
# Nightly MongoDB backup: dump -> upload to S3 -> verify -> only then delete
# the previous backup(s). Never deletes anything unless the new one is
# confirmed present and intact in S3 first.

DB_NAME="europan-alpha"
BUCKET="buyside-whisper-946281248821-eu-north-1-an"
S3_PREFIX="mongo-backups"
KEEP=7
MONGODUMP="/usr/bin/mongodump"
AWS="/usr/bin/aws"
TMP_DIR="/home/ec2-user/mongo-backup-tmp"
LOG="$TMP_DIR/backup.log"
TIMESTAMP=$(date +%F_%H-%M-%S)
FILENAME="backup-${TIMESTAMP}.gz"
LOCAL_DUMP="$TMP_DIR/$FILENAME"
S3_KEY="${S3_PREFIX}/${FILENAME}"

mkdir -p "$TMP_DIR"
echo "=== Backup started: $(date) ===" >> "$LOG"

# 1. Dump the database locally
if ! "$MONGODUMP" --uri="mongodb://localhost:27017/${DB_NAME}" --gzip --archive="$LOCAL_DUMP" >> "$LOG" 2>&1; then
  echo "ERROR: mongodump failed - aborting, nothing uploaded, nothing deleted" >> "$LOG"
  rm -f "$LOCAL_DUMP"
  exit 1
fi

# 2. Upload the new dump to S3 (as a new object, old backup untouched so far)
if ! "$AWS" s3 cp "$LOCAL_DUMP" "s3://${BUCKET}/${S3_KEY}" >> "$LOG" 2>&1; then
  echo "ERROR: upload to S3 failed - aborting, old backup left untouched" >> "$LOG"
  rm -f "$LOCAL_DUMP"
  exit 1
fi

# 3. Verify the upload: compare actual S3-reported size against the local file
LOCAL_SIZE=$(stat -c%s "$LOCAL_DUMP")
REMOTE_SIZE=$("$AWS" s3api head-object --bucket "$BUCKET" --key "$S3_KEY" --query 'ContentLength' --output text 2>>"$LOG")

if [ "$REMOTE_SIZE" != "$LOCAL_SIZE" ]; then
  echo "ERROR: uploaded size ($REMOTE_SIZE) != local size ($LOCAL_SIZE) - NOT deleting old backup" >> "$LOG"
  rm -f "$LOCAL_DUMP"
  exit 1
fi

echo "New backup verified in S3: $S3_KEY ($REMOTE_SIZE bytes)" >> "$LOG"

# 4. Only now that the new backup is confirmed good, keep the most recent
#    $KEEP backups and delete anything older than that. Filenames are
#    "backup-YYYY-MM-DD_HH-MM-SS.gz", so a plain lexicographic sort is also
#    a correct chronological sort - oldest first, newest last.
"$AWS" s3api list-objects-v2 --bucket "$BUCKET" --prefix "${S3_PREFIX}/" --query 'Contents[].Key' --output text 2>>"$LOG" \
  | tr '\t' '\n' | sort | head -n -"$KEEP" | while read -r key; do
  if [ -n "$key" ]; then
    echo "Deleting old backup (beyond retention of $KEEP): $key" >> "$LOG"
    "$AWS" s3 rm "s3://${BUCKET}/${key}" >> "$LOG" 2>&1
  fi
done

# 5. Clean up the local temp file - never let dumps pile up on local disk
rm -f "$LOCAL_DUMP"

echo "=== Backup completed successfully: $(date) ===" >> "$LOG"
echo "" >> "$LOG"
