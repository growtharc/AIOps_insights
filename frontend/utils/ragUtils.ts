/**
 * RAG (Retrieval-Augmented Generation) Utilities
 * Converts CSV data into searchable context for AI analysis
 */

import { CsvData } from '../types';

export interface DataContext {
  summary: string;
  sampleRows: string;
  columnInfo: string;
  statistics: string;
  uniqueValues: Record<string, string[]>;
}

/**
 * Analyzes CSV data and creates rich context for RAG
 */
export const createDataContext = (data: CsvData): DataContext => {
  if (!data || data.length === 0) {
    return {
      summary: 'No data available',
      sampleRows: '',
      columnInfo: '',
      statistics: '',
      uniqueValues: {}
    };
  }

  const columns = Object.keys(data[0]);
  
  // Create column information with data types and examples
  const columnInfo = columns.map(col => {
    const values = data.map(row => row[col]).filter(v => v != null);
    const types = new Set(values.map(v => typeof v));
    const typeStr = Array.from(types).join('/');
    const sample = values.slice(0, 3).map(v => `"${v}"`).join(', ');
    return `  - ${col} (${typeStr}): ${sample}`;
  }).join('\n');

  // Get unique values for categorical columns (with < 50 unique values)
  const uniqueValues: Record<string, string[]> = {};
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v != null);
    const unique = Array.from(new Set(values.map(v => String(v))));
    if (unique.length <= 50 && unique.length > 1) {
      uniqueValues[col] = unique;
    }
  });

  // Create statistics for numeric columns
  const stats: string[] = [];
  columns.forEach(col => {
    const numericValues = data
      .map(row => row[col])
      .filter(v => typeof v === 'number') as number[];
    
    if (numericValues.length > data.length * 0.5) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      stats.push(`  - ${col}: min=${min}, max=${max}, avg=${avg.toFixed(2)}, count=${numericValues.length}`);
    }
  });

  // Create sample rows
  const sampleRows = data.slice(0, 5).map((row, idx) => {
    const rowStr = columns.map(col => `${col}="${row[col]}"`).join(', ');
    return `  Row ${idx + 1}: {${rowStr}}`;
  }).join('\n');

  return {
    summary: `Dataset contains ${data.length} rows and ${columns.length} columns: ${columns.join(', ')}`,
    sampleRows,
    columnInfo,
    statistics: stats.join('\n') || 'No numeric columns found',
    uniqueValues
  };
};

/**
 * Creates a semantic text representation of the data for LLM context
 */
export const createSemanticContext = (data: CsvData, maxRows: number = 100): string => {
  if (!data || data.length === 0) return 'No data available';

  const context = createDataContext(data);
  const limitedData = data.slice(0, maxRows);
  
  let semanticText = `# Dataset Overview\n\n`;
  semanticText += `${context.summary}\n\n`;
  
  semanticText += `## Columns\n${context.columnInfo}\n\n`;
  
  if (context.statistics) {
    semanticText += `## Numeric Statistics\n${context.statistics}\n\n`;
  }
  
  if (Object.keys(context.uniqueValues).length > 0) {
    semanticText += `## Categorical Values\n`;
    Object.entries(context.uniqueValues).forEach(([col, values]) => {
      semanticText += `  - ${col}: ${values.slice(0, 20).join(', ')}${values.length > 20 ? '...' : ''}\n`;
    });
    semanticText += '\n';
  }
  
  semanticText += `## Sample Data (first ${Math.min(maxRows, data.length)} rows)\n`;
  semanticText += `${context.sampleRows}\n`;
  
  // Add full data representation for semantic search
  semanticText += `\n## Full Data Rows\n`;
  limitedData.forEach((row, idx) => {
    const rowText = Object.entries(row)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    semanticText += `${idx + 1}. ${rowText}\n`;
  });
  
  return semanticText;
};

/**
 * Extract insights from text data (like issue summaries)
 */
export const extractTextInsights = (
  data: CsvData,
  textColumn: string
): { commonPhrases: string[]; keywords: string[]; samples: string[] } => {
  const textValues = data
    .map(row => row[textColumn])
    .filter(v => v != null && typeof v === 'string') as string[];

  // Extract common words (simple keyword extraction)
  const allWords = textValues
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3); // Filter short words

  const wordFreq: Record<string, number> = {};
  allWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Get top keywords
  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  // Extract common phrases (bigrams)
  const bigrams: Record<string, number> = {};
  for (let i = 0; i < allWords.length - 1; i++) {
    const bigram = `${allWords[i]} ${allWords[i + 1]}`;
    bigrams[bigram] = (bigrams[bigram] || 0) + 1;
  }

  const commonPhrases = Object.entries(bigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase]) => phrase);

  return {
    commonPhrases,
    keywords,
    samples: textValues.slice(0, 10)
  };
};

