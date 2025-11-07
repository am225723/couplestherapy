#!/bin/bash

# Script to add Matthew and Karli Callahan as a couple linked to therapist

echo "Creating Callahan couple..."

# Step 1: Call the backend endpoint to create the couple
# This uses the service role to bypass RLS and create everything atomically

curl -X POST http://localhost:5000/api/public/register-couple \
  -H "Content-Type: application/json" \
  -d '{
    "invitation_code": "TEMP_CODE_PLACEHOLDER",
    "partner1_email": "matthew.callahan10@gmail.com",
    "partner1_password": "mcally88",
    "partner1_name": "Matthew Callahan",
    "partner2_email": "karli.callahan16@gmail.com",
    "partner2_password": "kcally16",
    "partner2_name": "Karli Callahan"
  }'

echo ""
echo "Note: This requires a valid invitation code from the therapist first!"
echo "Generate one at: /admin/invitation-codes"
