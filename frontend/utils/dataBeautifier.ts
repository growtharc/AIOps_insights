/**
 * Data Beautifier Utility
 * Transforms raw query results into human-readable, beautiful visualizations
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OF_WEEK_KEYWORDS = [
  'day of week',
  'day_of_week',
  'day-of-week',
  'dayofweek',
  'weekday',
  'week day',
  'dow',
  'day name',
  'dayname'
];
const DAY_METRIC_GUARD_TERMS = ['days', 'sla', 'tat', 'turnaround', 'resolution', 'aging'];

/**
 * Detects if a column contains numeric months (1-12)
 */
const isMonthColumn = (columnName: string, values: any[]): boolean => {
  const lowerName = columnName.toLowerCase();
  
  // Check if column name suggests it's a month
  if (!lowerName.includes('month') && !lowerName.includes('mnth') && !lowerName.includes('mon')) {
    return false;
  }
  
  // Check if all values are numbers between 1 and 12
  const numericValues = values.filter(v => typeof v === 'number');
  if (numericValues.length === 0) return false;
  
  const allInMonthRange = numericValues.every(v => v >= 1 && v <= 12);
  return allInMonthRange && numericValues.length >= values.length * 0.8; // At least 80% are valid months
};

/**
 * Detects if a column contains week numbers (1-53)
 */
const isWeekColumn = (columnName: string, values: any[]): boolean => {
  const lowerName = columnName.toLowerCase();
  
  // Check if column name suggests it's a week
  if (!lowerName.includes('week') && lowerName !== 'wk') {
    return false;
  }
  
  const numericValues = values.filter(v => typeof v === 'number');
  if (numericValues.length === 0) return false;
  
  // Week numbers are typically 1-53
  const allInWeekRange = numericValues.every(v => v >= 1 && v <= 53);
  return allInWeekRange && numericValues.length >= values.length * 0.8;
};

/**
 * Detects if a column contains day of week (1-7 or 0-6)
 */
const isDayOfWeekColumn = (columnName: string, values: any[]): boolean => {
  const lowerName = columnName.toLowerCase();
  
  const hasDayOfWeekIndicator =
    lowerName === 'day' ||
    DAY_OF_WEEK_KEYWORDS.some(keyword => lowerName.includes(keyword));
  const looksLikeMetricColumn = DAY_METRIC_GUARD_TERMS.some(term => lowerName.includes(term));

  // Avoid turning metrics like SLA/TAT (typically expressed in days) into day names.
  if (!hasDayOfWeekIndicator || looksLikeMetricColumn) {
    return false;
  }
  
  const numericValues = values.filter(v => typeof v === 'number');
  if (numericValues.length === 0) return false;
  
  const allInDayRange = numericValues.every(v => (v >= 0 && v <= 6) || (v >= 1 && v <= 7));
  return allInDayRange && numericValues.length >= values.length * 0.8;
};

/**
 * Detects if a column contains quarter information (1-4)
 */
const isQuarterColumn = (columnName: string, values: any[]): boolean => {
  const lowerName = columnName.toLowerCase();
  
  if (!lowerName.includes('quarter') && !lowerName.includes('qtr') && !lowerName.includes('q')) {
    return false;
  }
  
  const numericValues = values.filter(v => typeof v === 'number');
  if (numericValues.length === 0) return false;
  
  const allInQuarterRange = numericValues.every(v => v >= 1 && v <= 4);
  return allInQuarterRange && numericValues.length >= values.length * 0.8;
};

/**
 * Beautifies column names by making them more readable
 */
const beautifyColumnName = (name: string): string => {
  // Replace underscores and handle camelCase
  let beautified = name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Capitalize first letter of each word
  beautified = beautified
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Special handling for common abbreviations
  beautified = beautified
    .replace(/\bId\b/g, 'ID')
    .replace(/\bSla\b/g, 'SLA')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bHtml\b/g, 'HTML')
    .replace(/\bCss\b/g, 'CSS')
    .replace(/\bJson\b/g, 'JSON')
    .replace(/\bXml\b/g, 'XML')
    .replace(/\bSql\b/g, 'SQL')
    .replace(/\bIp\b/g, 'IP')
    .replace(/\bVip\b/g, 'VIP')
    .replace(/\bCeo\b/g, 'CEO')
    .replace(/\bCto\b/g, 'CTO');
  
  return beautified;
};

/**
 * Formats a number with appropriate locale and decimal places
 */
const formatNumber = (value: number, columnName: string): string | number => {
  const lowerName = columnName.toLowerCase();
  
  // Check if it's a percentage
  if (lowerName.includes('percent') || lowerName.includes('rate') || lowerName.includes('ratio')) {
    if (value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    } else if (value <= 100) {
      return `${value.toFixed(1)}%`;
    }
  }
  
  // Check if it's currency
  if (lowerName.includes('price') || lowerName.includes('cost') || lowerName.includes('amount') || 
      lowerName.includes('revenue') || lowerName.includes('salary')) {
    return value.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  
  // For very large numbers, use compact notation
  if (Math.abs(value) >= 1000000) {
    return value.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' });
  }
  
  // For regular numbers with decimals
  if (value % 1 !== 0) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  
  // For whole numbers
  return value.toLocaleString('en-US');
};

/**
 * Main function to beautify chart data
 */
export const beautifyChartData = (data: Record<string, any>[]): Record<string, any>[] => {
  if (!data || data.length === 0) {
    return data;
  }
  
  const keys = Object.keys(data[0]);
  
  // Analyze columns to detect types
  const columnTransformations: Record<string, 'month' | 'week' | 'day' | 'quarter' | 'rename' | 'format' | null> = {};
  const columnRenames: Record<string, string> = {};
  
  keys.forEach(key => {
    const values = data.map(row => row[key]).filter(v => v != null);
    
    if (isMonthColumn(key, values)) {
      columnTransformations[key] = 'month';
    } else if (isWeekColumn(key, values)) {
      columnTransformations[key] = 'week';
    } else if (isDayOfWeekColumn(key, values)) {
      columnTransformations[key] = 'day';
    } else if (isQuarterColumn(key, values)) {
      columnTransformations[key] = 'quarter';
    } else {
      columnTransformations[key] = null;
    }
    
    // Check if column name needs beautification
    const beautifiedName = beautifyColumnName(key);
    if (beautifiedName !== key) {
      columnRenames[key] = beautifiedName;
    }
  });
  
  // Transform the data
  const beautifiedData = data.map(row => {
    const newRow: Record<string, any> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      const transformation = columnTransformations[key];
      const newKey = columnRenames[key] || key;
      
      // Apply transformations
      if (value == null) {
        newRow[newKey] = value;
      } else if (transformation === 'month' && typeof value === 'number') {
        // Convert numeric month to month name
        // newRow[newKey] = MONTH_NAMES[value - 1] || value;
        newRow[newKey] = value;
      } else if (transformation === 'week' && typeof value === 'number') {
        // Keep week numbers as-is for proper sorting, but could format as "Week 1", "Week 2" if needed
        // For now, keep numeric for proper chart ordering
        newRow[newKey] = value;
      } else if (transformation === 'day' && typeof value === 'number') {
        // Convert numeric day to day name (assuming 0=Sun or 1=Mon)
        const dayIndex = value === 7 ? 0 : (value === 0 ? 0 : value - 1);
        newRow[newKey] = DAY_NAMES[dayIndex] || value;
      } else if (transformation === 'quarter' && typeof value === 'number') {
        // Convert numeric quarter to Q1, Q2, etc.
        newRow[newKey] = `Q${value}`;
      } else if (typeof value === 'number' && !Number.isInteger(value) || Math.abs(value) > 999) {
        // For the first column (usually category), keep as-is unless it's a transformation target
        if (Object.keys(row).indexOf(key) === 0 && !transformation) {
          newRow[newKey] = value;
        } else {
          // For numeric values in non-category columns, consider formatting
          // Only format if it looks like a metric (not ID, year, etc.)
          const lowerKey = key.toLowerCase();
          if (!lowerKey.includes('id') && !lowerKey.includes('year') && !lowerKey.includes('code')) {
            newRow[newKey] = value; // Keep as number for charts, but could format labels
          } else {
            newRow[newKey] = value;
          }
        }
      } else {
        newRow[newKey] = value;
      }
    });
    
    return newRow;
  });
  
  return beautifiedData;
};

/**
 * Formats tooltip values for better display
 */
export const formatTooltipValue = (value: any, name: string): string => {
  if (typeof value === 'number') {
    return formatNumber(value, name).toString();
  }
  return String(value);
};

/**
 * Formats axis tick labels
 */
export const formatAxisTick = (value: any, columnName: string): string => {
  if (typeof value === 'number') {
    const lowerName = columnName.toLowerCase();
    
    // Don't format years
    if (lowerName.includes('year') && value >= 1900 && value <= 2100) {
      return value.toString();
    }
    
    // Compact notation for large numbers on axis
    if (Math.abs(value) >= 1000000) {
      return value.toLocaleString('en-US', { notation: 'compact', compactDisplay: 'short' });
    } else if (Math.abs(value) >= 10000) {
      return (value / 1000).toFixed(0) + 'K';
    } else if (value % 1 !== 0) {
      return value.toFixed(1);
    }
    
    return value.toLocaleString('en-US');
  }
  
  return String(value);
};

