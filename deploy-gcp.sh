#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Deploying FlowNotebook to Google Cloud Run"
echo "=================================================="

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    if [ -f "/Users/alonglry/google-cloud-sdk/bin/gcloud" ]; then
        export PATH="/Users/alonglry/google-cloud-sdk/bin:$PATH"
    else
        echo "❌ gcloud CLI not found. Please install or add to PATH."
        exit 1
    fi
fi

# Ensure project is set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "⚠️ No active GCP project configured."
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using GCP Project: $PROJECT_ID"
SERVICE_ACCOUNT="cloudbuild-runner@${PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_TAG="gcr.io/${PROJECT_ID}/flownotebook:latest"

echo "🔨 Step 1: Building container with Google Cloud Build..."
gcloud builds submit \
  --config=cloudbuild.yaml \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT}" \
  .

echo ""
echo "🚀 Step 2: Deploying container to Cloud Run (Region: us-central1)..."
gcloud run deploy flownotebook \
  --image "$IMAGE_TAG" \
  --service-account "$SERVICE_ACCOUNT" \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 2

echo ""
echo "=================================================="
echo "🎉 Deployment Complete!"
echo "Your FlowNotebook is live and free on Google Cloud Run."
echo "=================================================="
