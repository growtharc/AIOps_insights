# Deployment Guide

This document provides instructions for deploying the AIOps Insights application.

## Environment Configuration

### Frontend Environment Variables

Create a `frontend/.env` file (or pass as build args):

```
VITE_API_BASE_URL=http://localhost:8080
```

For production:
```
VITE_API_BASE_URL=https://solutions.growtharc.com/insight_aiopsbe
```

### Backend Environment Variables

Create a `.env.local` file in the root directory:

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here
JIRA_PROJECT_KEY=YOUR_PROJECT
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

Build and run both services together:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

### Option 2: Separate Docker Containers

#### Backend

```bash
cd backend
docker build -t aiops-backend .
docker run -d -p 8080:8080 --env-file ../.env.local aiops-backend
```

#### Frontend

```bash
cd frontend
docker build -t aiops-frontend --build-arg VITE_API_BASE_URL=http://localhost:8080 .
docker run -d -p 3000:80 aiops-frontend
```

### Option 3: Production Deployment

For production deployment with custom domain:

#### Backend

```bash
cd backend
docker build -t aiops-backend:prod .
docker run -d \
  -p 8080:8080 \
  -e JIRA_BASE_URL=your_jira_url \
  -e JIRA_EMAIL=your_email \
  -e JIRA_API_TOKEN=your_token \
  -e JIRA_PROJECT_KEY=YOUR_KEY \
  -e OPENAI_API_KEY=your_key \
  aiops-backend:prod
```

#### Frontend

```bash
cd frontend
docker build -t aiops-frontend:prod \
  --build-arg VITE_API_BASE_URL=https://solutions.growtharc.com/insight_aiopsbe \
  .
docker run -d -p 80:80 aiops-frontend:prod
```

## Verification

After deployment:

1. Check backend health: `curl http://localhost:8080/healthcheck`
2. Access frontend: Open browser to `http://localhost:3000`
3. Click "Refresh Data" to verify Jira integration

## Environment Variables Reference

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_BASE_URL | Backend API base URL | http://localhost:8080 or https://solutions.growtharc.com/insight_aiopsbe |

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| JIRA_BASE_URL | Your Jira instance URL | Yes |
| JIRA_EMAIL | Jira account email | Yes |
| JIRA_API_TOKEN | Jira API token | Yes |
| JIRA_PROJECT_KEY | Jira project key | Yes |
| OPENAI_API_KEY | OpenAI API key | Yes |

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the backend's CORS configuration allows your frontend origin.

### Connection Refused

- Verify backend is running: `docker ps`
- Check backend logs: `docker logs <container-id>`
- Ensure the API URL is correctly set in frontend environment

### Build Failures

- Clear Docker cache: `docker-compose build --no-cache`
- Verify all dependencies are listed in package.json/requirements.txt
