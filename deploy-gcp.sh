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

echo "🔧 1. Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com || true

echo "🚢 2. Building and deploying directly to Google Cloud Run in region ${REGION}..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080

echo "✅ Deployment complete! Your service is running live on Google Cloud Run."
