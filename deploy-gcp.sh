#!/usr/bin/env bash
set -e

# ==============================================================================
# Workplace Ally — Google Cloud Run Deployment Script (Free Tier)
# ==============================================================================

echo "🚀 Deploying Workplace Ally to Google Cloud Run (Free Tier)..."

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ No active GCP project found. Run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

REGION=${GCP_REGION:-"europe-west1"}
SERVICE_NAME="ai-workplace-ally"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "📦 1. Building and submitting image via Google Cloud Build..."
gcloud builds submit --tag "$IMAGE_TAG"

echo "🚢 2. Deploying service to Google Cloud Run in region ${REGION}..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080

echo "✅ Deployment complete! Service is running on Google Cloud Run."
