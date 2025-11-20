import React, { useState, useRef, useEffect, FormEvent } from "react";
import type { Message, CsvData } from "./types";
import {
  createChatSession,
  sendMessage,
  type ChatSession,
  appendHistoryNote,
  getHistorySummary,
  retrySQLWithError,
} from "./services/openaiService";
import {
  requiresMultiStepAnalysis,
  performComprehensiveAnalysis,
} from "./services/aiAnalysisService";
import { fetchJiraData } from "./services/jiraService";
import MessageBubble from "./components/Message";
import { SendIcon, RefreshIcon } from "./components/Icons";
import { beautifyChartData } from "./utils/dataBeautifier";
import Header from "./components/Header/Header";
import "./App.scss"

const getInitialMessage = (isDataLoaded: boolean): Message => ({
  id: 0,
  role: "assistant",
  content: isDataLoaded
    ? "Jira data is loaded and ready. Ask me a question to generate an insight!"
    : "Hello! I'm your AI Data Analyst. Click 'Refresh Data' to load insights from Jira.",
});

function App() {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    getInitialMessage(false),
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chat, setChat] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setChat(null);
    setMessages([
      {
        id: 0,
        role: "assistant",
        isLoading: true,
        content: "Fetching data from Jira...",
      },
    ]);

    try {
      const data = await fetchJiraData();
      setCsvData(data);

      // This part is tricky. The current backend expects a file upload.
      // I will modify this to send the data directly to the backend.
      // I will assume a new endpoint `/session/load` that accepts JSON data.
      const res = await fetch("http://localhost:8080/session/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) throw new Error("Failed to load data to backend");

      const body = await res.json();
      const newSessionId = body.session_id as string;
      setSessionId(newSessionId);

      const newChat = createChatSession(data);
      setChat(newChat);

      // Fetch preview rows from backend
      const previewRes = await fetch("http://localhost:8080/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: newSessionId,
          sql: "SELECT * FROM data LIMIT 5",
        }),
      });
      const preview = await previewRes.json();
      const chartData = (preview.rows as any[]).map((row: any[]) => {
        const obj: any = {};
        preview.columns.forEach((c: string, i: number) => {
          obj[c] = row[i];
        });
        return obj;
      });

      setMessages([
        getInitialMessage(true),
        {
          id: 1,
          role: "assistant",
          content: {
            summary: `Successfully loaded ${data.length} issues from Jira. Here's a preview:`,
            visualization: "Table",
            chartData: beautifyChartData(chartData),
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      const error =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setMessages([
        getInitialMessage(false),
        {
          id: 1,
          role: "assistant",
          isError: true,
          error: `Failed to load data from Jira: ${error}`,
        },
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !csvData || !chat) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
    };
    const loadingMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const needsComprehensiveAnalysis = await requiresMultiStepAnalysis(
        userMessage.content as string,
        ""
      );

      if (needsComprehensiveAnalysis) {
        console.log("🔍 Using comprehensive multi-step analysis mode");

        const executeQuery = async (sql: string) => {
          if (!sessionId) throw new Error("No active session");
          const res = await fetch("http://localhost:8080/query/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, sql }),
          });
          if (!res.ok) {
            const errorBody = await res
              .json()
              .catch(() => ({ detail: "Unknown error" }));
            throw new Error(errorBody.detail || "SQL execution failed");
          }
          const body = await res.json();
          return (body.rows as any[]).map((row: any[]) => {
            const obj: any = {};
            (body.columns as string[]).forEach((c: string, i: number) => {
              obj[c] = row[i];
            });
            return obj;
          });
        };

        const historyContext = getHistorySummary(chat);
        const analysis = await performComprehensiveAnalysis(
          userMessage.content as string,
          csvData,
          executeQuery,
          historyContext
        );

        const richSummary = `${
          analysis.finalSummary
        }\n\n**Key Insights:**\n${analysis.keyInsights
          .map((insight, i) => `${i + 1}. ${insight}`)
          .join("\n")}`;

        if (analysis.isSummaryOnly) {
          const newAssistantMessage: Message = {
            id: loadingMessage.id,
            role: "assistant",
            content: {
              summary: richSummary,
              recommendation: analysis.recommendation,
            },
          };
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id ? newAssistantMessage : msg
            )
          );
          appendHistoryNote(
            chat,
            `Insight: Summary provided for: "${userMessage.content}"`
          );
        } else {
          let chartData = analysis.visualization?.data || [];
          chartData = beautifyChartData(chartData);

          const newAssistantMessage: Message = {
            id: loadingMessage.id,
            role: "assistant",
            content: {
              summary: richSummary,
              visualization: analysis.visualization?.type || "Table",
              chartData,
              recommendation: analysis.recommendation,
              sqlQuery: analysis.steps
                .map((s) => `-- Step ${s.step}: ${s.action}\n${s.sqlQuery}`)
                .join("\n\n"),
            },
          };
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id ? newAssistantMessage : msg
            )
          );
          const priorSqls = analysis.steps
            .filter((s) => s.sqlQuery)
            .map((s) => s.sqlQuery)
            .join(" ; ");
          if (priorSqls) appendHistoryNote(chat, `Generated SQL: ${priorSqls}`);
        }
      } else {
        console.log("⚡ Using simple SQL query mode");

        let assistantResponse = await sendMessage(
          chat,
          userMessage.content as string
        );
        let sql = assistantResponse.sqlQuery;
        let retryCount = 0;
        const MAX_RETRIES = 2;

        if (!sql || !sql.trim()) {
          throw new Error("The AI returned an empty query.");
        }

        if (!sessionId) throw new Error("No active session");

        let chartData;
        while (retryCount <= MAX_RETRIES) {
          try {
            const res = await fetch("http://localhost:8080/query/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sessionId, sql }),
            });

            if (!res.ok) {
              const errorBody = await res
                .json()
                .catch(() => ({ detail: "Unknown error" }));
              const errorMsg = errorBody.detail || "SQL execution failed";

              if (retryCount < MAX_RETRIES) {
                console.log(
                  `SQL failed (attempt ${
                    retryCount + 1
                  }), retrying with error feedback...`
                );
                assistantResponse = await retrySQLWithError(
                  chat,
                  userMessage.content as string,
                  errorMsg,
                  sql
                );
                sql = assistantResponse.sqlQuery;
                retryCount++;
                continue;
              } else {
                throw new Error(errorMsg);
              }
            }

            const body = await res.json();
            chartData = (body.rows as any[]).map((row: any[]) => {
              const obj: any = {};
              (body.columns as string[]).forEach((c: string, i: number) => {
                obj[c] = row[i];
              });
              return obj;
            });

            break;
          } catch (fetchError: any) {
            if (
              retryCount >= MAX_RETRIES ||
              fetchError.message.includes("Failed to fetch")
            ) {
              throw fetchError;
            }
            retryCount++;
          }
        }

        chartData = beautifyChartData(chartData!);

        const newAssistantMessage: Message = {
          id: loadingMessage.id,
          role: "assistant",
          content: { ...assistantResponse, chartData },
        };
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessage.id ? newAssistantMessage : msg
          )
        );
        appendHistoryNote(chat, `Generated SQL: ${sql}`);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Query execution error:", err);
      const errorMessage: Message = {
        id: loadingMessage.id,
        role: "assistant",
        isError: true,
        error: `I encountered an issue: ${error}\n\nTip: Try rephrasing your question or asking for simpler metrics first (like counts or averages).`,
      };
      setMessages((prev) =>
        prev.map((msg) => (msg.id === loadingMessage.id ? errorMessage : msg))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isDataLoaded = !!csvData;

  return (
    <div className="arcai-app">
  <Header />

  <main className="arcai-main">
    <div className="refresh-row">
      <button className="arc-btn-refresh" onClick={handleRefresh}>
        {isRefreshing ? "Refreshing..." : "Refresh Data"}
      </button>
    </div>

    <div className="messages-wrapper">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  </main>

  <footer className="arcai-footer">
    <form className="arc-input-bar" onSubmit={handleSendMessage}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask your question about Jira data..."
      />
      <button type="submit">
        <SendIcon />
      </button>
    </form>
  </footer>
</div>

  );
}

export default App;
