# AIOps Insights Support Data Analyst - RAG-Powered Analytics Platform

An intelligent data analysis platform that combines SQL execution with RAG (Retrieval-Augmented Generation) and multi-step reasoning to provide comprehensive insights from your CSV data.

## 🚀 Features

### Dual Analysis Modes

#### 1. **Simple SQL Mode** ⚡
- For specific, targeted queries
- Direct SQL generation and execution
- Fast responses for straightforward questions
- Example: "How many tickets were created in September?"

#### 2. **Comprehensive Analysis Mode** 🔍
- RAG-based intelligent analysis
- Multi-step reasoning and synthesis
- Automatic query planning and execution
- Rich insights and recommendations
- Example: "Summarize all issues in the CRM category"

### Intelligent Features

🤖 **RAG-Powered Intelligence**
- Semantic understanding of your data
- Context-aware query generation
- Multi-step analysis planning
- Insight synthesis from multiple queries
- Automatic visualization selection

📊 **Rich Visualizations**
- Bar Charts, Line Charts, Pie Charts
- Scatter Plots, Heat Maps, Tables
- Scorecards for KPIs
- Downloadable chart images
- Interactive tooltips with formatted values


## 🏃 Run Locally

### Prerequisites
- Node.js (v16 or higher)
- Python 3.10–3.12

### 1. Create Environment Files

#### Backend Environment File
Create a `.env` file in the `backend/` directory with your backend configuration:
```bash
# Backend .env file (backend/.env)
OPENAI_API_KEY=sk-proj-...
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=VD
JIRA_JQL_QUERY=project = VD ORDER BY created ASC
```

#### Frontend Environment File
Create a `.env` file in the `frontend/` directory with your frontend configuration:
```bash
# Frontend .env file (frontend/.env)
# Note: Vite requires the VITE_ prefix for environment variables to be accessible in the browser

# Backend API URL
VITE_API_BASE_URL=http://localhost:8080

# OpenAI API Key (required for frontend OpenAI calls)
VITE_OPENAI_API_KEY=sk-proj-...

# Jira Configuration
VITE_JIRA_DOMAIN=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_API_TOKEN=your_jira_api_token
VITE_JIRA_JQL_QUERY=project = VD ORDER BY created ASC
```

**Important Notes:**
- The frontend `.env` file must be in the `frontend/` directory (not the project root)
- All frontend environment variables must be prefixed with `VITE_` to be accessible in the browser
- After creating or modifying the `.env` file, you must restart the dev server for changes to take effect


### 2. Start the Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```
The backend will run at [http://localhost:8080](http://localhost:8080).
Test with: [http://localhost:8080/healthcheck](http://localhost:8080/healthcheck)

**Note:** The backend dependencies are installed in a virtual environment (`.venv`) to avoid conflicts with other projects.

### 3. Start the Frontend (React/Vite)
```bash
cd frontend
npm install
# Make sure you have created frontend/.env with VITE_OPENAI_API_KEY before starting
npm run dev
```
The frontend will run at [http://localhost:5173](http://localhost:5173) (or the port shown in terminal).

**Note:** If you see an error about missing `VITE_OPENAI_API_KEY`, ensure:
1. You have created a `.env` file in the `frontend/` directory (not the project root)
2. The variable is prefixed with `VITE_` (e.g., `VITE_OPENAI_API_KEY=...`)
3. You have restarted the dev server after creating/modifying the `.env` file


### 4. Usage
- Ask questions in natural language
- View insights and visualizations

## 🐳 Deploy with Docker (Recommended)

The easiest way to run the application is using Docker Compose, which orchestrates both the frontend and backend services.

### Prerequisites
- Docker and Docker Compose installed on your machine.

### 1. Configure Environment Variables

For Docker deployment, you need **three `.env` files**:

#### Root `.env` file (for Docker Compose build args)
Create a `.env` file in the project root:

```bash
# Root .env file (for Docker Compose)
# This file is used by docker-compose.yml for build arguments

# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=VD
JIRA_JQL_QUERY=project = VD ORDER BY created ASC

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Frontend Configuration (for Docker build args)
VITE_API_BASE_URL=http://localhost:8080
```

#### Backend `.env` file
Create `backend/.env` with the same backend variables (used for local dev and Docker runtime):

```bash
# Backend .env file (backend/.env)
OPENAI_API_KEY=sk-proj-...
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_PROJECT_KEY=VD
JIRA_JQL_QUERY=project = VD ORDER BY created ASC
```

#### Frontend `.env` file
Create `frontend/.env` with frontend variables (used for local dev):

```bash
# Frontend .env file (frontend/.env)
VITE_API_BASE_URL=http://localhost:8080
VITE_OPENAI_API_KEY=sk-proj-...
VITE_JIRA_DOMAIN=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_API_TOKEN=your_jira_api_token
VITE_JIRA_JQL_QUERY=project = VD ORDER BY created ASC
```

**Note:** For Docker, the root `.env` is used for build arguments, while `backend/.env` is used for runtime environment variables.

### 2. Run with Docker Compose
Start the application in detached mode:

```bash
docker-compose up --build -d
```

This command will:
1.  Build the **Backend** container (FastAPI)
2.  Build the **Frontend** container (Vite + Nginx)
3.  Start both services and connect them via a Docker network

### 3. Access the Application
-   **Frontend**: [http://localhost:3000](http://localhost:3000)
-   **Backend Health Check**: [http://localhost:8080/healthcheck](http://localhost:8080/healthcheck)

### Troubleshooting
-   **White Screen / API Errors**: Ensure `VITE_OPENAI_API_KEY` and other `VITE_` variables are correctly passed during the build. If you change environment variables, you must rebuild the containers:
    ```bash
    docker-compose up --build --force-recreate -d
    ```
-   **Jira Connection Errors**: Verify your `JIRA_BASE_URL` and `JIRA_API_TOKEN`. Ensure the `JIRA_JQL_QUERY` is valid.

---

## 🏃 Run Locally (Manual Setup)

If you prefer to run without Docker:

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Configure your .env file
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure your .env file
npm run dev
```
Access at [http://localhost:5173](http://localhost:5173).

## 📖 How It Works

### Architecture

```
User Question
     ↓
Question Analysis (AI determines mode)
     ↓
     ├─→ [Simple Mode] → Single SQL Query → Results → Visualization
     │
     └─→ [Comprehensive Mode] → RAG Analysis
                                    ↓
                              Plan Analysis Steps
                                    ↓
                              Execute Multiple Queries
                                    ↓
                              Synthesize Insights
                                    ↓
                              Generate Summary + Visualization
```

### RAG (Retrieval-Augmented Generation) Implementation

1. **Data Context Creation**: Converts CSV data into semantic text representation
2. **Query Understanding**: AI analyzes question complexity
3. **Analysis Planning**: Creates multi-step analysis strategy
4. **Iterative Execution**: Runs queries and builds insights
5. **Synthesis**: Combines all findings into comprehensive summary

## 💡 Example Queries

### Simple Mode Queries
- "How many tickets were resolved in October?"
- "Show me the average resolution time by priority"
- "Count incidents by status"

### Comprehensive Analysis Queries
- "Summarize all issues in the CRM category"
- "What are the main problems affecting user satisfaction?"
- "Analyze trends in support tickets over the last 6 months"
- "Identify the most common issues and their patterns"

## 🛠 Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: OpenAI GPT-4o-mini
- **SQL Engine**: AlaSQL (client-side)
- **Data Processing**: PapaParse

## 📂 Project Structure

```
├── backend/                     # FastAPI backend (Python)
│   ├── api/                     # API routers (Jira, session, query)
│   ├── services/                # Business logic (Jira, LLM, etc.)
│   ├── app.py                   # FastAPI app factory
│   ├── main.py                  # Entrypoint for Uvicorn
│   ├── models.py                # Data models
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Backend Dockerfile
│   └── .env.example             # Backend env template
├── frontend/                    # React + Vite frontend (TypeScript)
│   ├── src/                     # Source code
│   ├── Dockerfile               # Frontend Dockerfile
│   ├── nginx.conf               # Nginx configuration
│   ├── .env.example             # Frontend env template
│   └── package.json
├── docker-compose.yml           # Docker Compose orchestration
├── .env                         # Root environment variables (gitignored)
└── README.md
```

## 🔒 Privacy & Security

- **Client-Side Processing**: All data stays in your browser
- **No Server Storage**: CSV files are never uploaded to any server
- **Secure API Calls**: Only SQL queries and analysis requests sent to OpenAI
- **Privacy First**: Your sensitive data never leaves your machine

## 🎯 Key Benefits

1. **Natural Language Interface**: Ask questions in plain English
2. **Intelligent Analysis**: AI decides the best approach for each question
3. **Beautiful Visualizations**: Automatic formatting and chart selection
4. **Comprehensive Insights**: Multi-step reasoning for complex questions
5. **Privacy-Preserving**: Client-side data processing
6. **No Database Required**: Works directly with CSV files
