export interface AssistantResponse {
  sqlQuery: string;
  summary: string;
  visualization: string;
  recommendation?: string;
  chartData?: Record<string, any>[]; // Data for the chart, added by the app
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: number;
  role: MessageRole;
  content?: string | Partial<AssistantResponse>;
  isLoading?: boolean;
  isError?: boolean;
  error?: string;
}

export type CsvData = Record<string, string | number>[];