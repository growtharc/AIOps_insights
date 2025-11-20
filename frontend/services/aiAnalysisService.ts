/**
 * Advanced AI Analysis Service with RAG and Multi-Step Reasoning
 * This service enables intelligent data analysis beyond simple SQL queries
 */

import OpenAI from 'openai';
import { createSemanticContext, createDataContext } from '../utils/ragUtils';
import { CsvData } from '../types';

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

export interface AnalysisStep {
  step: number;
  action: string;
  sqlQuery?: string;
  result?: any;
  insight?: string;
}

export interface ComprehensiveAnalysis {
  question: string;
  steps: AnalysisStep[];
  finalSummary: string;
  keyInsights: string[];
  visualization?: {
    type: string;
    data: Record<string, any>[];
  };
  recommendation: string;
  isSummaryOnly?: boolean; // True for pure summary questions that don't need visualizations
}

const intelligentAnalysisPrompt = `
You are an advanced AI data analyst capable of performing comprehensive, multi-step analyses. You have access to a dataset and can perform SQL queries on a backend SQLite database (table name: data).

Your capabilities:
1. Understanding complex questions that require multiple analyses
2. Breaking down questions into analytical steps
3. Executing SQL queries against SQLite (table name is always 'data')
4. Synthesizing results from multiple queries
5. Generating insights and recommendations

When given a question:
1. Determine if it requires a simple query or multi-step analysis
2. For complex questions (like "what are common issues", "summarize trends", "identify patterns"):
   - Plan your analysis steps
   - Execute necessary queries
   - Synthesize findings
   - Generate comprehensive summary

SQL Constraints (SQLite):
- Table name is always 'data'
- Supported: SELECT, WHERE, GROUP BY, ORDER BY, COUNT, SUM, AVG, MIN, MAX, CASE WHEN
- NOT supported: WINDOW functions (OVER/PARTITION BY/ROWS BETWEEN), LEAD/LAG, WEEK()
- Use backticks for column names with spaces: \`Column Name\`

Output Format:
- For simple questions: Return a single SQL query with explanation
- For complex questions: Return analysis plan with multiple steps

Remember:
- Month numbers (1-12) will be auto-converted to month names in visualizations
- Large numbers will be formatted automatically
- Focus on accurate analysis - presentation is handled by the system
`;

/**
 * Determines if a question requires multi-step analysis
 */
export const requiresMultiStepAnalysis = async (
  question: string,
  dataContext: string
): Promise<boolean> => {
  const lowerQ = question.toLowerCase();

  // ALWAYS use simple SQL mode for these clear analytical questions
  const simpleSqlIndicators = [
    'which category', 'which', 'compare', 'comparison',
    'high', 'low', 'most', 'least', 'top', 'bottom',
    'sla missed', 'sla met', 'missed sla', 'met sla',
    'average by', 'total by', 'count by', 'group by',
    'trend', 'forecast', 'predict', 'expected', 'next month',
    'how many', 'how much', 'show me',
    // Temporal analysis keywords
    'weekwise', 'week wise', 'week by week', 'weekly', 'each week', 'per week',
    'monthwise', 'month wise', 'month by month', 'monthly', 'each month', 'per month',
    'daily', 'day by day', 'each day', 'per day',
    'over time', 'timeline', 'time series', 'temporal'
  ];

  // If it's a direct analytical question, use simple SQL mode
  if (simpleSqlIndicators.some(indicator => lowerQ.includes(indicator))) {
    console.log('⚡ Direct analytical question detected - using simple SQL mode');
    return false; // Use simple SQL mode
  }

  // Only questions asking for comprehensive summaries need multi-step
  const multiStepIndicators = [
    'summarize', 'summarise', 'summary',
    'overview', 'describe', 'explain'
  ];

  if (multiStepIndicators.some(indicator => lowerQ.includes(indicator))) {
    console.log('🔍 Summary question detected - using comprehensive mode');
    return true; // Use comprehensive mode
  }

  // Default to simple SQL for everything else
  console.log('⚡ Defaulting to simple SQL mode');
  return false;
};

/**
 * Plans analysis steps for complex questions
 */
const planAnalysisSteps = async (
  question: string,
  columns: string[],
  dataContext: string,
  historyContext?: string
): Promise<{ steps: string[]; finalVisualization: string }> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: intelligentAnalysisPrompt
      },
      {
        role: 'user',
        content: `
Question: "${question}"

Available columns: ${columns.join(', ')}

Data Context:
${dataContext}

Previous Queries (for context only, do not repeat blindly):
${historyContext || 'None'}

Create an analysis plan with 2-4 steps. Each step should describe what query to run and why.
Also suggest the best final visualization type.

Return JSON in this format:
{
  "steps": ["Step 1: Count issues by category", "Step 2: Get top 10 most common issue summaries", ...],
  "finalVisualization": "Table" or "Bar Chart" or "Line Chart" etc.
}
`
      }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const plan = JSON.parse(response.choices[0]?.message?.content || '{}');
  return {
    steps: plan.steps || [],
    finalVisualization: plan.finalVisualization || 'Table'
  };
};

/**
 * Generates SQL query for a specific analysis step
 */
const generateStepQuery = async (
  stepDescription: string,
  columns: string[],
  previousSteps: AnalysisStep[],
  historyContext?: string
): Promise<string> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  const previousContext = previousSteps.length > 0
    ? `\n\nPrevious analysis steps:\n${previousSteps.map(s =>
      `Step ${s.step}: ${s.action}\nQuery: ${s.sqlQuery}\nInsight: ${s.insight}`
    ).join('\n\n')}`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${intelligentAnalysisPrompt}\n\nGenerate a SQL query for the given analysis step. Return ONLY the SQL query, nothing else.`
      },
      {
        role: 'user',
        content: `
Analysis step: ${stepDescription}
Available columns: ${columns.join(', ')}
${previousContext}
${historyContext ? `\nRelevant prior queries:\n${historyContext}` : ''}

Generate the SQL query (table name must be 'data'):
`
      }
    ],
    temperature: 0.2,
    max_tokens: 500
  });

  return response.choices[0]?.message?.content?.trim() || '';
};

/**
 * Generates insight from query result
 */
const generateInsight = async (
  stepDescription: string,
  queryResult: any[]
): Promise<string> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  const resultSummary = queryResult.length > 0
    ? JSON.stringify(queryResult.slice(0, 10), null, 2)
    : 'No results';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a data analyst. Generate a brief, insightful observation (1-2 sentences) about the query result.'
      },
      {
        role: 'user',
        content: `Analysis: ${stepDescription}\n\nResult (${queryResult.length} rows):\n${resultSummary}\n\nInsight:`
      }
    ],
    temperature: 0.4,
    max_tokens: 150
  });

  return response.choices[0]?.message?.content?.trim() || '';
};

/**
 * Synthesizes final summary from all analysis steps
 */
const synthesizeFinalSummary = async (
  question: string,
  steps: AnalysisStep[]
): Promise<{ summary: string; keyInsights: string[]; recommendation: string }> => {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
  }

  const stepsContext = steps.map(s =>
    `Step ${s.step}: ${s.action}\nInsight: ${s.insight}\nResult count: ${s.result?.length || 0} rows`
  ).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a senior data analyst synthesizing findings from multiple analyses into a comprehensive summary.'
      },
      {
        role: 'user',
        content: `
Original Question: "${question}"

Analysis Steps Performed:
${stepsContext}

Create a comprehensive summary with:
1. A clear, executive summary (2-3 sentences)
2. 3-5 key insights as bullet points
3. A practical recommendation

Return JSON:
{
  "summary": "Executive summary here...",
  "keyInsights": ["Insight 1", "Insight 2", ...],
  "recommendation": "Recommendation here..."
}
`
      }
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' }
  });

  const synthesis = JSON.parse(response.choices[0]?.message?.content || '{}');
  return {
    summary: synthesis.summary || 'Analysis complete.',
    keyInsights: synthesis.keyInsights || [],
    recommendation: synthesis.recommendation || 'Continue monitoring.'
  };
};

/**
 * Determines if question is asking for a pure summary (no charts needed)
 * vs SQL analysis with visualizations
 */
const isSummaryOnlyQuestion = (question: string): boolean => {
  const lowerQ = question.toLowerCase();

  // Questions that REQUIRE SQL + Charts (not summary-only)
  const sqlModeIndicators = [
    'which category', 'which', 'compare', 'comparison', 'vs', 'versus',
    'trend', 'forecast', 'predict', 'expected', 'next month', 'moving average',
    'show me', 'chart', 'graph', 'plot',
    'high', 'low', 'most', 'least', 'top', 'bottom',
    'sla missed', 'sla met', 'missed sla', 'met sla',
    'average', 'total', 'count by', 'group by',
    'breakdown', 'distribution', 'how many'
  ];

  // If question has SQL indicators, use SQL mode
  if (sqlModeIndicators.some(indicator => lowerQ.includes(indicator))) {
    return false; // Use SQL mode with charts
  }

  // Pure summary keywords (only these should use summary-only mode)
  const pureSummaryKeywords = [
    'summarize', 'summarise', 'summary',
    'overview of', 'give me an overview',
    'tell me about the issues', 'describe the issues',
    'explain the issues', 'what are the issues'
  ];

  // Only use summary-only mode if it's explicitly asking for a summary
  return pureSummaryKeywords.some(kw => lowerQ.includes(kw));
};

/**
 * Hybrid analysis for summary questions (SQL for accuracy + AI for insights)
 */
const performHybridSummaryAnalysis = async (
  question: string,
  data: CsvData,
  executeQuery: (sql: string) => Promise<any[]>
): Promise<{ summary: string; keyInsights: string[]; recommendation: string; sqlQueries: string[] }> => {
  // Validate data
  if (!data || data.length === 0) {
    console.error('❌ No data provided to analyze');
    return {
      summary: 'No data available to analyze.',
      keyInsights: ['Please upload a CSV file first'],
      recommendation: 'Upload your data file to begin analysis.',
      sqlQueries: []
    };
  }

  const columns = Object.keys(data[0] || {});
  if (columns.length === 0) {
    console.error('❌ No columns found in data');
    return {
      summary: 'Unable to read data structure.',
      keyInsights: ['Data appears to be empty or malformed'],
      recommendation: 'Check your CSV file format.',
      sqlQueries: []
    };
  }

  // Detect category/filter from question - handle multi-word categories
  const categoryMatch = question.match(/in (?:the )?['"]?([^'"?]+?)['"]?\s*category/i) ||
    question.match(/category\s*-\s*['"]?([^'"?]+?)['"]?\s*\??\s*$/i) ||
    question.match(/issues?\s+(?:in|for)\s+['"]?([^'"?]+?)['"]?\s*\??/i);
  const targetCategory = categoryMatch ? categoryMatch[1].trim() : null;

  // Find likely category column
  const categoryColumn = columns.find(col =>
    col.toLowerCase().includes('category') ||
    col.toLowerCase().includes('type') ||
    col.toLowerCase() === 'category'
  );

  // Find text/summary columns
  const textColumns = columns.filter(col =>
    col.toLowerCase().includes('summary') ||
    col.toLowerCase().includes('description') ||
    col.toLowerCase().includes('issue') ||
    col.toLowerCase().includes('title') ||
    col.toLowerCase().includes('subject')
  );

  // Build WHERE clause for filtering - escape SQL special characters
  let whereClause = '';
  if (targetCategory && categoryColumn) {
    const escapedCategory = targetCategory.replace(/'/g, "''").toLowerCase();
    const safeColumnName = categoryColumn.includes(' ') || /[^a-zA-Z0-9_]/.test(categoryColumn)
      ? `\`${categoryColumn}\``
      : categoryColumn;
    whereClause = `WHERE LOWER(${safeColumnName}) LIKE '%${escapedCategory}%'`;
  }

  // Execute SQL queries to get ACCURATE statistics
  const sqlQueries: string[] = [];
  const queryResults: Record<string, any> = {};

  try {
    // Debug logging
    console.log('🔍 Starting hybrid analysis...');
    console.log('Available columns:', columns.join(', '));

    if (targetCategory) {
      console.log(`📌 Detected category: "${targetCategory}" from question`);
      console.log(`📊 Using column: "${categoryColumn}" for filtering`);
      console.log(`🔎 WHERE clause: ${whereClause}`);
    } else {
      console.log('📊 No category filter - analyzing all data');
    }

    // Query 1: Count total and filtered records
    const countQuery = `SELECT COUNT(*) as total_count FROM data ${whereClause}`;
    sqlQueries.push(countQuery);
    console.log('Executing count query:', countQuery);

    try {
      const countResult = await executeQuery(countQuery);
      queryResults.totalCount = countResult[0]?.total_count || 0;
      console.log(`✓ Found ${queryResults.totalCount} matching records`);
    } catch (countError: any) {
      console.error('❌ Count query failed:', countError.message);
      throw new Error(`Count query failed: ${countError.message}`);
    }

    // Query 2: Get statistics for numeric columns (TAT, priority, etc.)
    const numericColumns = columns.filter(col => {
      const sample = data.find(row => row[col] != null);
      return sample && typeof sample[col] === 'number';
    });

    if (numericColumns.length > 0) {
      console.log('📊 Numeric columns found:', numericColumns.join(', '));
      for (const col of numericColumns.slice(0, 3)) { // Limit to top 3 numeric columns
        try {
          const safeCol = col.includes(' ') || /[^a-zA-Z0-9_]/.test(col) ? `\`${col}\`` : col;
          const colAlias = col.replace(/[^a-zA-Z0-9_]/g, '_'); // Safe alias name

          const statsQuery = `SELECT 
            AVG(${safeCol}) as avg_${colAlias},
            MIN(${safeCol}) as min_${colAlias},
            MAX(${safeCol}) as max_${colAlias}
          FROM data ${whereClause}`;
          sqlQueries.push(statsQuery);
          const statsResult = await executeQuery(statsQuery);
          if (statsResult[0]) {
            queryResults[`stats_${col}`] = statsResult[0];
            const avgVal = statsResult[0][`avg_${colAlias}`];
            console.log(`✓ ${col} stats: avg=${typeof avgVal === 'number' ? avgVal.toFixed(3) : avgVal}, min=${statsResult[0][`min_${colAlias}`]}, max=${statsResult[0][`max_${colAlias}`]}`);
          }
        } catch (statsError: any) {
          console.warn(`⚠️ Stats query failed for ${col}:`, statsError.message);
          // Continue with other columns
        }
      }
    }

    // Query 3: Get sample data
    let sampleData: any[] = [];
    try {
      const sampleQuery = `SELECT * FROM data ${whereClause} LIMIT 20`;
      sqlQueries.push(sampleQuery);
      sampleData = await executeQuery(sampleQuery);
      console.log(`✓ Retrieved ${sampleData.length} sample rows`);
    } catch (sampleError: any) {
      console.warn('⚠️ Sample query failed:', sampleError.message);
      sampleData = data.slice(0, 20); // Fallback to raw data
    }

    // Query 4: If there's a category column, get breakdown
    if (categoryColumn && !whereClause) {
      // Only get breakdown if we're analyzing all categories
      try {
        const safeCatCol = categoryColumn.includes(' ') || /[^a-zA-Z0-9_]/.test(categoryColumn)
          ? `\`${categoryColumn}\``
          : categoryColumn;
        const categoryQuery = `SELECT ${safeCatCol}, COUNT(*) as count FROM data GROUP BY ${safeCatCol} ORDER BY count DESC LIMIT 10`;
        sqlQueries.push(categoryQuery);
        const categoryBreakdown = await executeQuery(categoryQuery);
        queryResults.categoryBreakdown = categoryBreakdown;
        console.log(`✓ Category breakdown: ${categoryBreakdown.length} categories`);
      } catch (catError: any) {
        console.warn('⚠️ Category breakdown query failed:', catError.message);
      }
    }

    // Query 5: Get unique values for text columns (most common issues)
    if (textColumns.length > 0) {
      console.log('📝 Text columns found:', textColumns[0]);
      try {
        const textCol = textColumns[0];
        const safeTextCol = textCol.includes(' ') || /[^a-zA-Z0-9_]/.test(textCol)
          ? `\`${textCol}\``
          : textCol;
        const commonIssuesQuery = `SELECT ${safeTextCol}, COUNT(*) as frequency FROM data ${whereClause} GROUP BY ${safeTextCol} ORDER BY frequency DESC LIMIT 10`;
        sqlQueries.push(commonIssuesQuery);
        const commonIssues = await executeQuery(commonIssuesQuery);
        queryResults.commonIssues = commonIssues;
        console.log(`✓ Common issues: ${commonIssues.length} unique issues found`);
      } catch (textError: any) {
        console.warn('⚠️ Common issues query failed:', textError.message);
      }
    }

    // Create context with ACCURATE numbers from SQL
    const analysisContext = `
Question: "${question}"

ACCURATE SQL Query Results:
- Total matching records: ${queryResults.totalCount}
${targetCategory ? `- Category filter: "${targetCategory}"` : ''}

${Object.keys(queryResults).filter(k => k.startsWith('stats_')).map(key => {
      const col = key.replace('stats_', '');
      const colAlias = col.replace(/[^a-zA-Z0-9_]/g, '_');
      const stats = queryResults[key];
      const avgVal = stats[`avg_${colAlias}`];
      return `- ${col}: avg=${typeof avgVal === 'number' ? avgVal.toFixed(3) : avgVal}, min=${stats[`min_${colAlias}`]}, max=${stats[`max_${colAlias}`]}`;
    }).join('\n')}

${queryResults.categoryBreakdown ? `\nCategory Breakdown:\n${queryResults.categoryBreakdown.map((row: any) => `- ${row[categoryColumn]}: ${row.count} records`).join('\n')}` : ''}

${queryResults.commonIssues ? `\nMost Common Issues:\n${queryResults.commonIssues.map((row: any, idx: number) => `${idx + 1}. ${row[textColumns[0]]} (${row.frequency} occurrences)`).join('\n')}` : ''}

Sample Data (first 10 rows):
${sampleData.slice(0, 10).map((row: any, idx: number) => {
      const rowStr = Object.entries(row)
        .slice(0, 5) // Show first 5 columns
        .map(([key, val]) => `${key}="${val}"`)
        .join(', ');
      return `${idx + 1}. ${rowStr}`;
    }).join('\n')}
`;

    // Ask AI to generate insights from ACCURATE data
    if (!openai) {
      throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file and restart the dev server.');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a data analyst. SQL queries have been executed to provide ACCURATE statistics from the database.

⚠️ CRITICAL RULES - DO NOT VIOLATE:
1. Use ONLY the EXACT numbers from "ACCURATE SQL Query Results" section
2. NEVER calculate, estimate, or make up any statistics
3. When mentioning metrics like TAT, avg, min, max - copy the EXACT values shown
4. If a statistic is not provided in the SQL results, DO NOT mention it
5. Quote numbers with proper precision (e.g., 0.4 not 0.15, use decimals as shown)

Your task:
1. Write a clear 2-3 sentence summary using ONLY the provided exact statistics
2. List 3-5 specific insights referencing the actual numbers from SQL results
3. Provide one practical recommendation based on the data

Return JSON format:
{
  "summary": "Summary using exact numbers like: avg=0.4, count=55, etc.",
  "keyInsights": ["Insight with exact number from SQL", "Another with real stat", ...],
  "recommendation": "Practical action based on real data patterns..."
}`
        },
        {
          role: 'user',
          content: analysisContext
        }
      ],
      temperature: 0.1, // Very low temperature to minimize hallucination
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      summary: analysis.summary || 'No analysis available.',
      keyInsights: analysis.keyInsights || [],
      recommendation: analysis.recommendation || 'Continue monitoring data quality.',
      sqlQueries
    };

  } catch (error: any) {
    console.error('❌ Error in hybrid analysis:', error);
    console.error('Error details:', error.message);
    console.error('SQL queries attempted:', sqlQueries);

    // Provide helpful error message
    const errorMsg = error.message || 'Unknown error';
    return {
      summary: `Unable to analyze data: ${errorMsg}. This might be due to a column mismatch or SQL syntax issue.`,
      keyInsights: [
        'The system encountered an error while querying your data',
        'Check the browser console for detailed error logs',
        `Error: ${errorMsg}`
      ],
      recommendation: 'Try rephrasing your question or check if the column names match your data structure.',
      sqlQueries
    };
  }
};

/**
 * Main function to perform comprehensive multi-step analysis
 */
export const performComprehensiveAnalysis = async (
  question: string,
  data: CsvData,
  executeQuery: (sql: string) => Promise<any[]>,
  historyContext?: string
): Promise<ComprehensiveAnalysis> => {
  const columns = Object.keys(data[0] || {});

  // Check if this is a summary-only question
  if (isSummaryOnlyQuestion(question)) {
    console.log('📊 Using hybrid SQL+AI analysis (summary mode with accurate stats)');

    // Perform hybrid analysis: SQL for accuracy + AI for insights
    const { summary, keyInsights, recommendation, sqlQueries } = await performHybridSummaryAnalysis(question, data, executeQuery);

    return {
      question,
      steps: [], // Don't show steps for summary mode
      finalSummary: summary,
      keyInsights,
      recommendation,
      isSummaryOnly: true
      // SQL queries are used but not shown in UI for cleaner summary presentation
    };
  }

  // Otherwise, use the SQL-based multi-step approach
  console.log('🔍 Using SQL-based multi-step analysis');
  const dataContext = createSemanticContext(data, 50);

  // Plan the analysis
  const plan = await planAnalysisSteps(question, columns, dataContext, historyContext);

  // Execute each step
  const steps: AnalysisStep[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const stepDescription = plan.steps[i];

    // Generate query for this step
    const sqlQuery = await generateStepQuery(stepDescription, columns, steps, historyContext);

    // Execute query
    let result: any[] = [];
    try {
      result = await executeQuery(sqlQuery);
    } catch (error) {
      console.error(`Error executing step ${i + 1}:`, error);
      result = [];
    }

    // Generate insight
    const insight = await generateInsight(stepDescription, result);

    steps.push({
      step: i + 1,
      action: stepDescription,
      sqlQuery,
      result,
      insight
    });
  }

  // Synthesize final summary
  const { summary, keyInsights, recommendation } = await synthesizeFinalSummary(question, steps);

  // Determine best data to visualize (usually the most informative step)
  const visualizationStep = steps.find(s => s.result && s.result.length > 0 && s.result.length < 100) || steps[0];

  return {
    question,
    steps,
    finalSummary: summary,
    keyInsights,
    visualization: visualizationStep?.result ? {
      type: plan.finalVisualization,
      data: visualizationStep.result
    } : undefined,
    recommendation
  };
};

