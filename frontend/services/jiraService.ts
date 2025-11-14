// services/jiraService.ts
import { CsvData } from '../types';

// Main function to be called from the UI
export const fetchJiraData = async (): Promise<CsvData> => {
    const response = await fetch('http://localhost:8080/jira/issues', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch Jira data from backend');
    }

    const data: CsvData = await response.json();
    return data;
};

