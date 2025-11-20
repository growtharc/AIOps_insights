import React, { useState, useEffect } from "react";
import type { Message, AssistantResponse } from "../types";
import {
  UserIcon,
  SparklesIcon,
  ClipboardIcon,
  CheckIcon,
  ChevronDownIcon,
  LightbulbIcon,
  DownloadIcon,
} from "./Icons";
import ChartRenderer from "./ChartRenderer";

interface MessageProps {
  message: Message;
}

const LoadingIndicator: React.FC = () => (
  <div className="ai-loading-indicator">
    <div></div>
    <div></div>
    <div></div>
  </div>
);

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) setTimeout(() => setCopied(false), 2000);
  }, [copied]);

  return (
    <div className="code-block">
      <div className="code-header">
        <span>SQL Query</span>
        <button onClick={copy}>
          {copied ? <CheckIcon /> : <ClipboardIcon />}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const SqlAccordion: React.FC<{ sqlQuery: string }> = ({ sqlQuery }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="sql-accordion">
      <button onClick={() => setOpen(!open)} className="sql-accordion-btn">
        <span>View SQL Query</span>
        <ChevronDownIcon className={open ? "rotated" : ""} />
      </button>
      {open && <CodeBlock code={sqlQuery} />}
    </div>
  );
};

const DataTableAccordion: React.FC<{ data: any[] }> = ({ data }) => {
  const [open, setOpen] = useState(false);
  if (!data?.length) return null;

  const keys = Object.keys(data[0]);

  return (
    <div className="table-accordion">
      <div className="table-accordion-header">
        <button onClick={() => setOpen(!open)} className="table-toggle">
          <span>View Data Table ({data.length} rows)</span>
          <ChevronDownIcon className={open ? "rotated" : ""} />
        </button>
        <button className="table-download">
          <DownloadIcon />
        </button>
      </div>

      {open && (
        <div className="table-wrapper">
          <table className="ai-table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {keys.map((k) => (
                    <td key={k}>{String(row[k])}</td>
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
  const parts = text.split("\n").map((line, i) => {
    // Handle bold text with **text**
    const boldFormatted = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={j}>{part}</span>;
    });

    return (
      <div key={i} className={i > 0 ? "mt-2" : ""}>
        {boldFormatted}
      </div>
    );
  });

  return <>{parts}</>;
};

const InsightCard: React.FC<{
  content: Partial<AssistantResponse>;
  messageId?: number;
}> = ({ content, messageId }) => {
  const { summary, sqlQuery, visualization, chartData } = content;
  const [selectedType, setSelectedType] = useState(visualization || "Table");

  if (!summary && !chartData) return null;

  return (
    <div className="insight-card">
      <div className="insight-section">
        {summary && (
          <div className="insight-summary">
            <FormattedText text={summary} />
          </div>
        )}
      </div>

      {chartData && chartData.length > 0 && (
        <div className="insight-chart">
          <div className="insight-chart-controls">
            {!messageId || messageId !== 1 ? (
              <>
                <span>Chart type</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option>Bar Chart</option>
                  <option>Line Chart</option>
                  <option>Pie Chart</option>
                </select>
              </>
            ) : null}
          </div>

          <ChartRenderer
            type={selectedType}
            data={chartData}
            showDownload={messageId !== 1}
          />
        </div>
      )}

      {chartData && chartData.length > 0 && messageId !== 1 && (
        <DataTableAccordion data={chartData} />
      )}

      {sqlQuery && <SqlAccordion sqlQuery={sqlQuery} />}
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const { role, content, isLoading, isError, error, id } = message;
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="user-msg">
        <div className="user-avatar">
          <UserIcon />
        </div>
        <div className="user-bubble">{content}</div>
      </div>
    );
  }

  return (
    <div className="ai-msg">
      <div className="ai-avatar">
        <SparklesIcon />
      </div>

      <div className="ai-container">
        {/* {isLoading && (
          <div className="ai-loading-bubble">
            <LoadingIndicator />
          </div>
        )}

        {isError && (
          <div className="ai-error-bubble">
            <p>{error}</p>
          </div>
        )}

        {content && typeof content === "string" && (
          <div className="ai-text-bubble">
            <p>{content}</p>
          </div>
        )} */}

        <div className="ai-bubble">
          {isLoading && (
            <div className="ai-loading-inline">
              <LoadingIndicator />
            </div>
          )}

          {isError && <p className="ai-error-text">{error}</p>}

          {content && typeof content === "string" && (
            <p className="ai-text">{content}</p>
          )}

          {content && typeof content !== "string" && (
            <InsightCard content={content} messageId={id} />
          )}
        </div>

        {/* {content && typeof content !== "string" && (
          <InsightCard content={content} messageId={id} />
        )} */}
      </div>
    </div>
  );
};

export default MessageBubble;
