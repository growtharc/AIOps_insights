// services/jiraService.ts
import { CsvData } from '../types';
import { API_BASE_URL } from '../config';

// Main function to be called from the UI
export const fetchJiraData = async (): Promise<CsvData> => {
    const response = await fetch(`${API_BASE_URL}/jira/issues`, {
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

