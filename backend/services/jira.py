# backend/services/jira.py
import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from datetime import datetime

# Load from .env.local (if present) for local development, else fallback to system env
load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env.local"), override=True)

JIRA_DOMAIN = os.getenv("VITE_JIRA_DOMAIN")
if JIRA_DOMAIN and JIRA_DOMAIN.startswith('"') and JIRA_DOMAIN.endswith('"'):
    JIRA_DOMAIN = JIRA_DOMAIN[1:-1]

EMAIL = os.getenv("VITE_JIRA_EMAIL")
if EMAIL and EMAIL.startswith('"') and EMAIL.endswith('"'):
    EMAIL = EMAIL[1:-1]

API_TOKEN = os.getenv("VITE_JIRA_API_TOKEN")
if API_TOKEN and API_TOKEN.startswith('"') and API_TOKEN.endswith('"'):
    API_TOKEN = API_TOKEN[1:-1]

JQL_QUERY = os.getenv("VITE_JIRA_JQL_QUERY")
if JQL_QUERY and JQL_QUERY.startswith('"') and JQL_QUERY.endswith('"'):
    JQL_QUERY = JQL_QUERY[1:-1]

MAX_RESULTS = 1000

def fetch_jira_data():
    session = requests.Session()
    session.auth = HTTPBasicAuth(EMAIL, API_TOKEN)
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    # Step 1: Fetch all field definitions to get custom field IDs
    fields_response = session.get(f"{JIRA_DOMAIN}/rest/api/3/field", headers=headers)
    if fields_response.status_code != 200:
        raise Exception(f"Error fetching fields: {fields_response.status_code} - {fields_response.text}")
    
    fields_data = fields_response.json()
    field_map = {f["id"]: f["name"] for f in fields_data}
    field_ids_by_name = {f["name"]: f["id"] for f in fields_data}

    SLA_FIELD = field_ids_by_name.get("SLA DAYS")
    TAT_FIELD = field_ids_by_name.get("TAT DAYS")
    CATEGORY_FIELD = field_ids_by_name.get("CATEGORY")
    AIOPS_ENABLED_FIELD = "customfield_10237" # AIOPS Enabled
    AIOPS_RESOLUTION_FIELD = "customfield_10239" # AIOPS Resolution
    # Step 2: Fetch all issues
    all_issues = []
    next_page_token = None
    while True:
        # Request all fields by ID to ensure custom fields are included efficiently
        payload = {
            "jql": JQL_QUERY,
            "maxResults": MAX_RESULTS,
            "fields": list(field_map.keys())
        }
        if next_page_token:
            payload["nextPageToken"] = next_page_token

        response = session.post(f"{JIRA_DOMAIN}/rest/api/3/search/jql", headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"Error fetching issues: {response.status_code} - {response.text}")

        data = response.json()
        issues = data.get("issues", [])
        if not issues:
            break

        all_issues.extend(issues)
        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break

    def extract_description(desc):
        if not desc:
            return ""
        if isinstance(desc, str):
            return desc.strip()
        parts = []
        if "content" in desc:
            for block in desc.get("content", []):
                for c in block.get("content", []):
                    if c.get("type") == "text" and c.get("text"):
                        parts.append(c["text"])
                    elif c.get("type") == "hardBreak":
                        parts.append("\n")
        return "".join(parts).strip()

    rows = []
    for issue in all_issues:
        f = issue.get("fields", {})
        created = f.get("created", "")
        month = ""
        if created:
            try:
                month = datetime.strptime(created, "%Y-%m-%dT%H:%M:%S.%f%z").strftime("%B")
            except ValueError:
                try:
                    month = datetime.strptime(created, "%Y-%m-%dT%H:%M:%S.%f").strftime("%B")
                except ValueError:
                    month = ""
        
        assignee = ""
        if f.get("assignee"):
            assignee = f["assignee"].get("displayName", "")

        status = f.get("status", {}).get("name", "")

        rows.append({
            "Ticket_request": issue.get("key"),
            "Summary": f.get("summary"),
            "Description": extract_description(f.get("description")),
            "Category": f.get(CATEGORY_FIELD),
            "Assignee": assignee,
            "Status": status,
            "Date_request_recieved": f.get("created"),
            "Date_request_solved": f.get("resolutiondate"),
            "SLA (Days)": f.get(SLA_FIELD),
            "TAT (days)": f.get(TAT_FIELD),
            "Month": month,
            "AIOPS Enabled": f.get(AIOPS_ENABLED_FIELD),
            "AIOPS Resolution": f.get(AIOPS_RESOLUTION_FIELD)
        })

    return rows
