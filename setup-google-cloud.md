# Google Cloud Setup Guide for Claude CLI

## Step 1: Enable Vertex AI API

1. Go to: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
2. Click **"Enable"**
3. Wait ~30 seconds

## Step 2: Create Service Account

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **"Create Service Account"**
3. Fill in:
   - Name: `claude-cli`
   - Description: `Service account for Claude CLI access`
4. Click **"Create and Continue"**
5. Grant role: **"Vertex AI User"**
6. Click **"Continue"** then **"Done"**

## Step 3: Create and Download Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key" → "Create new key"**
4. Choose **JSON**
5. Click **"Create"**
6. Save the downloaded file as:
   ```
   c:\Users\acer\Desktop\Mero-attendance\google-cloud-key.json
   ```

## Step 4: Get Your Project ID

1. Go to: https://console.cloud.google.com/
2. Look at the top navigation bar
3. You'll see your project name - click it
4. Copy the **"Project ID"** (e.g., `my-first-project-428106`)
5. Keep it - you'll need it!

## Step 5: Enable Claude in Model Garden

1. Go to: https://console.cloud.google.com/vertex-ai/model-garden
2. Search for "Claude"
3. Click on **"Claude Sonnet"** (recommended) or any Claude model
4. Click **"Enable"** or **"View Terms"**
5. Fill out and agree to the form
6. Wait for approval (usually instant)
