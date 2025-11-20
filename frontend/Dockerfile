# Multi-stage build for React + Vite frontend

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm install instead of npm ci to handle package-lock.json sync issues
# In production, ensure package-lock.json is up to date and use npm ci
RUN npm install

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_BASE_URL
ARG VITE_OPENAI_API_KEY
ARG VITE_JIRA_DOMAIN
ARG VITE_JIRA_EMAIL
ARG VITE_JIRA_API_TOKEN
ARG VITE_JIRA_JQL_QUERY

# Set them as environment variables for the build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}
ENV VITE_JIRA_DOMAIN=${VITE_JIRA_DOMAIN}
ENV VITE_JIRA_EMAIL=${VITE_JIRA_EMAIL}
ENV VITE_JIRA_API_TOKEN=${VITE_JIRA_API_TOKEN}
ENV VITE_JIRA_JQL_QUERY=${VITE_JIRA_JQL_QUERY}

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
