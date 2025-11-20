import OpenAI from 'openai';
import { AssistantResponse, CsvData } from '../types';
import { createDataContext, DataContext } from '../utils/ragUtils';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!API_KEY) {
  // In dev, log a warning instead of throwing, to allow the app to load and show a UI error
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("VITE_OPENAI_API_KEY environment variable not set. The app will not function until this is set.");
    console.warn("Please create a .env file in the frontend/ directory with VITE_OPENAI_API_KEY=your_key");
    console.warn("Then restart the dev server with 'npm run dev'");
  } else {
    throw new Error("VITE_OPENAI_API_KEY environment variable not set.");
  }
}

// Only create the OpenAI client if API_KEY is available
const openai = API_KEY ? new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

const baseSystemInstruction = `
You are a world-class AI data analyst specializing in IT Service Management (ITSM) data. Your task is to translate user questions into valid SQL queries that can be run on a backend SQLite database (table name: data). Your main goal is to provide actionable insights, not just raw data.

**Core Principles:**
*   **EXAMINE THE DATA FIRST:** You will receive the list of available columns and a summary of the data, including sample values for columns. Before writing any query, think about what the columns likely contain based on their names and the sample values.
*   **TEMPORAL ANALYSIS (CRITICAL):** When users ask for time-based analysis:
    - "weekwise", "week by week", "weekly", "each week", "per week" → GROUP BY Week (if Week column exists)
    - "monthwise", "month by month", "monthly", "each month", "per month" → GROUP BY Month
    - "daily", "each day", "per day" → GROUP BY Day (if exists)
    - "over time", "timeline", "trend" → GROUP BY temporal column (Week, Month, Day)
    - ALWAYS return multiple rows for time-based analysis (one row per time period)
    - Example: "weekwise plot" → SELECT Week, COUNT(*) as count FROM data GROUP BY Week ORDER BY Week
*   **Month/Date columns:** If you see a 'Month' column and the user mentions a month name like "September", you MUST check the provided data context to see if the column contains numbers (1-12) or text (e.g., 'September', 'Jan'). If the column is text, you MUST use single quotes in the WHERE clause (e.g., WHERE Month = 'September'). If the column is numeric, use the corresponding number (e.g., WHERE Month = 9).
*   Analyze the user's question and use your ITSM knowledge to create appropriate queries
*   When no data is returned, explain why clearly and suggest alternatives
*   Always visualize data when possible - choose the most appropriate chart type

**Technical Constraints (SQLite-compatible):**
*   The table name is always 'data' - Example: SELECT COUNT(*) FROM data WHERE status = 'Open'
*   **Forbidden functions (WILL CAUSE ERRORS):** window functions like OVER/PARTITION BY/ROWS BETWEEN, LEAD(), LAG(), WEEK()
*   Prefer simple GROUP BY over complex date functions; use existing columns (e.g., Week, Month, Day) when present
*   **For WEEK analysis:**
    - Check available columns FIRST
    - If 'Week' column exists: SELECT Week, COUNT(*) FROM data GROUP BY Week ORDER BY Week
    - If no Week column but there's Month: explain you can provide monthly breakdown instead
*   **For QUARTER analysis:** If needed, use CASE expressions over a Month column already present
*   Use standard SQL: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, COUNT, SUM, AVG, MIN, MAX, CASE WHEN
*   Enclose column names with spaces in backticks: \`SLA (Days)\`
*   **For temporal charts:** MUST return multiple rows (one per time period) with time column first, then metrics
    - Example: SELECT Week, COUNT(*) as Tickets FROM data GROUP BY Week ORDER BY Week

**Key Guidance:**
*   **Month Names → Numbers:** When user says "September", "October", etc., if Month is numeric, map them accordingly (Jan=1..Dec=12)
*   **SLA Analysis:** SLA Met = actual <= target, SLA Missed = actual > target. Use CASE WHEN to count each.
*   **Zero-day / Same-day resolution:** Filter WHERE TAT = 0 or TAT < 1 (depending on TAT unit in data)
*   **Median calculation:** SQLite doesn't have MEDIAN(). Use percentile approximation or suggest AVG() as alternative
*   **Spread/Distribution:** Use MIN, MAX, AVG, and COUNT to describe distribution
*   **Correlation:** Use multiple columns in SELECT and let the chart show the relationship. Example: SELECT Category, AVG(TAT), COUNT(*) FROM data GROUP BY Category
*   **On-time/SLA rate:** Calculate as percentage: ROUND(100.0 * SUM(CASE WHEN sla_met THEN 1 ELSE 0 END) / COUNT(*), 1) AS sla_rate
*   **Multiple Questions:** If user asks multiple things in one question ("which X and which Y"), create ONE query with multiple columns.
*   **CRITICAL - Forecasting/Predictions:** When user asks about FUTURE, NEXT MONTH, EXPECTED, PREDICT, TREND, "what may be expected", or similar forward-looking questions:
    - **DO NOT** use simple aggregations on historical data (e.g., COUNT(*) WHERE Month = X)
    - **ALWAYS** use moving average methodology: calculate the average per period across recent historical data
    - **Pattern**: Use a subquery to aggregate metrics per time period, then average those aggregations
    - Example logic: "To predict next month's category volumes, calculate how many tickets each category got per month over the last 3-4 months, then average those monthly counts"
    - The result represents the expected baseline for the future period
    - Apply this pattern to ANY forecast question, adapting the grouping dimensions (Category, Solution, etc.) and metric (COUNT, SUM, AVG) based on the question
*   **Empty Results:** Always explain WHY no data was found and suggest alternatives.
*   **Complex aggregations:** Break down into subqueries when needed. Example for rate by week + category: SELECT Week, Category, SUM(...)/COUNT(...) FROM data GROUP BY Week, Category

**Chart Selection:**
Choose the best visualization based on data structure:
*   **Line Chart:** For temporal/time-series data (Week, Month, Day, Date columns). Perfect for trends over time.
*   **Bar Chart:** For category comparisons (comparing different categories, types, or groups)
*   **Pie Chart:** For proportions of a whole (showing percentage distribution)
*   **Scorecard:** For single metric (one number summary)
*   **Table:** For detailed data with many columns or when specific values matter
*   **Heat Map:** For 2D magnitude data (x-axis category, y-axis category, color=value)
*   **Scatter Plot:** For correlations between two numeric variables
*   **CRITICAL:** If your query returns Week/Month/Day as first column → ALWAYS choose Line Chart for temporal trends

**Response Format:**
*   **SQL Query:** Valid SQL (SQLite-style) using available columns; table name must be data
*   **Summary:** Clear explanation of what the query shows and its business meaning. If no results, explain why and suggest alternatives.
*   **Recommendation:** Suggest a relevant follow-up analysis
*   **Visualization:** Best chart type for the data

**Data Beautification:**
The system automatically beautifies data for visualization. Don't worry about formatting in your queries:
*   Numeric months (1-12) are automatically converted to month names (Jan, Feb, Mar, etc.)
*   Column names are automatically prettified (snake_case → Title Case)
*   Large numbers are formatted with thousand separators and compact notation (1M, 2.5K)
*   Percentages, currency, and other metrics are formatted appropriately
*   Focus on writing accurate queries - the presentation is handled automatically

Available columns and data context will be provided. Use your expertise to create insightful queries that answer the user's question accurately.
`;

const jsonSchema = {
  type: 'object',
  properties: {
    sqlQuery: {
      type: 'string',
      description: 'The generated SQL query. The table name must be "data"',
    },
    summary: {
      type: 'string',
      description: "A concise, plain English summary of the query's purpose and the insight it provides.",
    },
    visualization: {
      type: 'string',
      description: "The suggested chart type. Must be one of: 'Bar Chart', 'Line Chart', 'Pie Chart', 'Table', 'Heat Map', 'Scatter Plot', or 'Scorecard'.",
    },
    recommendation: {
      type: 'string',
      description: 'A relevant follow-up question or analytical next step the user could take.'
    }
  },
  required: ['sqlQuery', 'summary', 'visualization', 'recommendation'],
  additionalProperties: false
} as const;

export interface ChatSession {
  history: { role: 'user' | 'assistant'; content: string }[];
  systemInstruction: string;
}

export const createChatSession = (data: CsvData): ChatSession => {
  const columns = Object.keys(data[0] || {});
  const dataContext = createDataContext(data);

  let contextString = `\n\n## Column Overview\n${dataContext.columnInfo}\n`;
  if (dataContext.statistics) {
    contextString += `\n## Numeric Column Statistics\n${dataContext.statistics}\n`;
  }
  if (Object.keys(dataContext.uniqueValues).length > 0) {
    contextString += `\n## Categorical Column Values\n`;
    Object.entries(dataContext.uniqueValues).forEach(([col, values]) => {
      contextString += `  - ${col}: ${values.slice(0, 20).join(', ')}${values.length > 20 ? '...' : ''}\n`;
    });
  }

  const fullSystemInstruction = `${baseSystemInstruction}\n\nAvailable columns: [${columns.join(', ')}]\n${contextString}`;

  return {
    history: [],
    systemInstruction: fullSystemInstruction,
  };
};

export const sendMessage = async (session: ChatSession, prompt: string): Promise<Omit<AssistantResponse, 'chartData'>> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  try {
    const messages = [
      { role: 'system' as const, content: session.systemInstruction },
      ...session.history,
      { role: 'user' as const, content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'AssistantResponse',
          schema: jsonSchema as any,
          strict: true,
        },
      },
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    const parsedResponse = JSON.parse(content);

    // update conversation history
    session.history.push({ role: 'user', content: prompt });
    session.history.push({ role: 'assistant', content });

    return parsedResponse as Omit<AssistantResponse, 'chartData'>;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate SQL from OpenAI API: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with the AI.');
  }
};

// Append a synthetic assistant note into history (e.g., executed SQL, chart type)
export const appendHistoryNote = (session: ChatSession, note: string): void => {
  session.history.push({ role: 'assistant', content: note });
};

// Return a compact summary of previous notes to inform subsequent prompts
export const getHistorySummary = (session: ChatSession, maxItems: number = 5): string => {
  const recent = session.history
    .filter(m => m.role === 'assistant' && /Generated SQL|Chart|Insight/i.test(m.content))
    .slice(-maxItems)
    .map(m => m.content)
    .join('\n');
  return recent;
};

// Retry SQL generation with error feedback
export const retrySQLWithError = async (
  session: ChatSession,
  prompt: string,
  errorMessage: string,
  failedSQL: string
): Promise<Omit<AssistantResponse, 'chartData'>> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  const retryPrompt = `Previous attempt failed with this error: "${errorMessage}"\n\nFailed SQL: ${failedSQL}\n\nPlease fix the SQL query and try again.\n\nOriginal question: ${prompt}`;

  const messages = [
    { role: 'system' as const, content: session.systemInstruction },
    ...session.history,
    { role: 'user' as const, content: retryPrompt },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.2, // Lower temperature for correction
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'AssistantResponse',
        schema: jsonSchema as any,
        strict: true,
      },
    },
  });

  const content = completion.choices?.[0]?.message?.content ?? '';
  const parsedResponse = JSON.parse(content);

  // Don't update history with retry - wait for success
  return parsedResponse as Omit<AssistantResponse, 'chartData'>;
};
