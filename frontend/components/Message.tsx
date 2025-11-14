import React, { useState, useEffect } from 'react';
import type { Message, AssistantResponse } from '../types';
import { UserIcon, SparklesIcon, ClipboardIcon, CheckIcon, ChevronDownIcon, LightbulbIcon, DownloadIcon } from './Icons';
import ChartRenderer from './ChartRenderer';

interface MessageProps {
  message: Message;
}

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
  </div>
);

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden mt-2 border border-gray-200">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100">
        <span className="text-xs font-sans text-gray-600">SQL Query</span>
        <button onClick={handleCopy} className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-900 transition-colors">
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 text-sm text-blue-700 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const SqlAccordion: React.FC<{ sqlQuery: string }> = ({ sqlQuery }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mt-4 border-t border-gray-200 pt-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex justify-between items-center w-full text-sm font-medium text-gray-600 hover:text-gray-900"
            >
                <span>View SQL Query</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <CodeBlock code={sqlQuery} />}
        </div>
    );
};


const DataTableAccordion: React.FC<{ data: Record<string, any>[] }> = ({ data }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);

    const handleDownloadCSV = () => {
        // Convert data to CSV
        const csvRows = [];
        csvRows.push(keys.join(','));
        
        data.forEach(row => {
            const values = keys.map(key => {
                const val = row[key];
                // Escape commas and quotes
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            });
            csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `data-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    <span>View Data Table ({data.length} rows)</span>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <button
                    onClick={handleDownloadCSV}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    title="Download as CSV"
                >
                    <DownloadIcon className="w-4 h-4" />
                </button>
            </div>
            {isOpen && (
                <div className="mt-3 overflow-x-auto max-h-80 border border-gray-200 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                {keys.map(key => <th key={key} scope="col" className="px-4 py-2 font-semibold">{key}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                                    {keys.map(key => (
                                        <td key={key} className="px-4 py-2 whitespace-nowrap">
                                            {typeof row[key] === 'number' ? row[key].toLocaleString() : String(row[key])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Simple markdown-like formatting for bold text and line breaks
    const parts = text.split('\n').map((line, i) => {
        // Handle bold text with **text**
        const boldFormatted = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
        });
        
        return <div key={i} className={i > 0 ? 'mt-2' : ''}>{boldFormatted}</div>;
    });
    
    return <>{parts}</>;
};

const InsightCard: React.FC<{ content: Partial<AssistantResponse>; messageId?: number }> = ({ content, messageId }) => {
    const { summary, sqlQuery, visualization, chartData, recommendation } = content;
    const [selectedType, setSelectedType] = useState<string>(visualization || 'Table');
    
    // Hide data table accordion for initial preview (message id 1)
    const isInitialPreview = messageId === 1;
    
    // Show the card if we have at least summary or chartData
    if (!summary && !chartData) return null;

    // Determine if this is a summary-only response (no chart/SQL)
    const isSummaryOnly = summary && !chartData && !visualization;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
             <div className={`p-4 ${isSummaryOnly ? 'pb-4' : ''}`}>
                {summary && (
                    <div className="text-base text-gray-800">
                        <FormattedText text={summary} />
                    </div>
                )}
            </div>
            
            {chartData && chartData.length > 0 && (
                <div className="p-4 pt-0">
                    {!isInitialPreview && (
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500">Chart type</span>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Bar Chart</option>
                                <option>Line Chart</option>
                                <option>Pie Chart</option>
                            </select>
                        </div>
                    )}
                    <ChartRenderer type={selectedType} data={chartData} showDownload={!isInitialPreview} />
                </div>
            )}
            
            {chartData && chartData.length > 0 && !isSummaryOnly && !isInitialPreview && (
                <div className="px-4 pb-4">
                    <DataTableAccordion data={chartData} />
                </div>
            )}
            
            {sqlQuery && (
                <div className="px-4 pb-4">
                    <SqlAccordion sqlQuery={sqlQuery} />
                </div>
            )}
        </div>
    );
};


const MessageBubble: React.FC<MessageProps> = ({ message }) => {
    const { role, content, isLoading, isError, error } = message;
  
    const isUser = role === 'user';
    
    // User message bubble has a different style and doesn't need a complex container
    if (isUser) {
        return (
            <div className="flex items-start gap-4 my-6 flex-row-reverse">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white bg-gray-400">
                    <UserIcon className="w-5 h-5" />
                </div>
                <div className="max-w-2xl w-full p-4 rounded-xl shadow-sm bg-blue-600 text-white rounded-br-none">
                    {typeof content === 'string' && <p>{content}</p>}
                </div>
            </div>
        );
    }
    
    // Assistant message bubble
    return (
        <div className="flex items-start gap-4 my-6 flex-row">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white bg-blue-600">
                <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="max-w-3xl w-full">
                {isLoading && (
                    <div className="p-4 rounded-xl shadow-sm bg-white border border-gray-200 text-gray-700 rounded-bl-none">
                        <LoadingIndicator />
                    </div>
                )}
                {isError && (
                     <div className="p-4 rounded-xl shadow-sm bg-white border border-gray-200 text-gray-700 rounded-bl-none">
                        <p className="text-red-600">{error || 'An error occurred.'}</p>
                    </div>
                )}
                {content && typeof content !== 'string' && (
                    <InsightCard content={content} messageId={message.id} />
                )}
                 {content && typeof content === 'string' && (
                    <div className="p-4 rounded-xl shadow-sm bg-white border border-gray-200 text-gray-700 rounded-bl-none">
                        <p>{content}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;