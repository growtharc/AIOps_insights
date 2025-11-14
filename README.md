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

### 1. Create Environment File
Create a `.env` file in the project root and add your OpenAI API key:
```bash
echo "VITE_OPENAI_API_KEY=your_openai_api_key_here" > .env.local
```
**Note:** The `.env` file is required for the app to access the OpenAI API and Jira. Without it, features that use OpenAI or Jira will not work.

**Note:** we need to add JIRA creds to the same file a well like VITE_JIRA_DOMAIN, VITE_JIRA_EMAIL, VITE_JIRA_API_TOKEN, VITE_JIRA_JQL_QUERY.


### 2. Start the Backend (FastAPI)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd .. # Go back to the project root
source backend/.venv/bin/activate # Re-activate venv from root context
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```
The backend will run at [http://localhost:8080](http://localhost:8080).
Test with: [http://localhost:8080/healthcheck](http://localhost:8080/healthcheck)

**Note:** The backend dependencies are installed in a virtual environment (`.venv`) to avoid conflicts with other projects.

### 3. Start the Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at [http://localhost:5173](http://localhost:5173) (or the port shown in terminal).


### 4. Usage
- Ask questions in natural language
- View insights and visualizations

## 🐳 Deploy with Docker to a VM

This section outlines how to deploy the application using Docker to a Virtual Machine (VM).

### Prerequisites
-   A VM with Docker installed.
-   SSH access to your VM.

### 1. Build the Docker Image
Navigate to the project root directory on your local machine (where the `Dockerfile` is located) and build the Docker image:

```bash
docker build -t insights-copilot .
```
This command builds the Docker image and tags it as `insights-copilot`.

### 2. Transfer the Docker Image to your VM (Optional, if not using a registry)
If you are not using a Docker registry (like Docker Hub), you can save the image to a tar file and copy it to your VM:

```bash
docker save -o insights-copilot.tar insights-copilot
scp insights-copilot.tar user@your_vm_ip:/path/to/vm/directory
```
Then, on your VM, load the image:
```bash
docker load -i insights-copilot.tar
```

Alternatively, push to a Docker registry (recommended for production):
```bash
docker tag insights-copilot your_registry/insights-copilot:latest
docker push your_registry/insights-copilot:latest
```
Then, on your VM, pull the image:
```bash
docker pull your_registry/insights-copilot:latest
```

### 3. Run the Docker Container on your VM
On your VM, run the Docker container. Ensure you map the necessary ports and pass your environment variables.

First, create an `.env` file on your VM with your API keys and Jira credentials:
```bash
# /path/to/vm/directory/.env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_JIRA_DOMAIN=your_jira_domain_here
VITE_JIRA_EMAIL=your_jira_email_here
VITE_JIRA_API_TOKEN=your_jira_api_token_here
VITE_JIRA_JQL_QUERY=your_jira_jql_query_here
```

Then, run the container, mounting the `.env` file and mapping ports:
```bash
docker run -d \
  --name insights-copilot-app \
  -p 80:8080 \
  --env-file /path/to/vm/directory/.env \
  insights-copilot
```
-   `-d`: Runs the container in detached mode (in the background).
-   `--name insights-copilot-app`: Assigns a name to your container.
-   `-p 80:8080`: Maps port 80 on your VM to port 8080 inside the container. You can change `80` to any available port on your VM.
-   `--env-file /path/to/vm/directory/.env`: Provides environment variables from the `.env` file on your VM.
-   `insights-copilot`: The name of the Docker image to use.

### 4. Access the Application
Once the container is running, you can access the application through your VM's IP address or domain name on the mapped port (e.g., `http://your_vm_ip`).

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
│   ├── .venv/                   # Python virtual environment
│   ├── api/                     # API routers (Jira, session, query)
│   ├── services/                # Business logic (Jira, LLM, etc.)
│   ├── __init__.py
│   ├── app.py                   # FastAPI app factory
│   ├── main.py                  # Entrypoint for Uvicorn
│   ├── models.py                # Data models
│   ├── requirements.txt         # Python dependencies
│   └── state.py
├── frontend/                    # React + Vite frontend (TypeScript)
│   ├── components/              # UI components
│   ├── services/                # API and AI services
│   ├── utils/                   # Data formatting and helpers
│   ├── App.tsx                  # Main app component
│   ├── index.html
│   ├── index.tsx
│   ├── package.json
│   └── ...                      # Other frontend files
├── .env                         # Environment variables (not committed)
├── Dockerfile                   # Production Dockerfile for backend
├── .dockerignore                # Docker ignore file
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
