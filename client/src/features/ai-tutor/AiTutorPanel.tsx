import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  askAiTutorStream,
  extractPdfDocument,
  type ExtractedDocument,
  type TutorMessagePayload,
} from "../../services/ai";
import "./ai-tutor.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  "Tóm tắt các ý chính của tài liệu này",
  "Giải thích những khái niệm quan trọng nhất một cách dễ hiểu",
  "Tạo 5 câu hỏi trắc nghiệm ôn tập kèm đáp án từ tài liệu",
  "Lập dàn ý ngắn gọn để thuyết trình nội dung này",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AiTutorPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [docMeta, setDocMeta] = useState<ExtractedDocument | null>(null);
  const [contextText, setContextText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setUploadError("Chỉ hỗ trợ tải lên file định dạng PDF (.pdf).");
      return;
    }

    setUploadError("");
    setExtracting(true);

    try {
      const extracted = await extractPdfDocument(file);
      setDocMeta(extracted);
      setContextText(extracted.text);
      if (!extracted.text) {
        setUploadError(
          "File PDF không có văn bản trích xuất được (có thể là file scan ảnh).",
        );
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Lỗi khi đọc file PDF.",
      );
    } finally {
      setExtracting(false);
    }
  }

  function clearDocument() {
    setDocMeta(null);
    setContextText("");
    setUploadError("");
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  }

  async function sendPrompt(rawPrompt: string) {
    const cleanPrompt = rawPrompt.trim();
    if (!cleanPrompt || sending) return;

    const history: TutorMessagePayload[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: cleanPrompt,
      createdAt: nowTimeLabel(),
    };

    const assistantId = `a-${Date.now() + 1}`;
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatError("");
    setSending(true);

    let started = false;
    try {
      await askAiTutorStream(
        {
          prompt: cleanPrompt,
          context: contextText.trim() || undefined,
          history,
        },
        (chunk) => {
          if (!started) {
            started = true;
            setMessages((prev) => [
              ...prev,
              {
                id: assistantId,
                role: "assistant",
                content: chunk,
                createdAt: nowTimeLabel(),
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setChatError(
        err instanceof Error ? err.message : "Không thể kết nối AI Tutor.",
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendPrompt(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendPrompt(input);
    }
  }

  const hasContext = contextText.trim().length > 0;
  const waitingFirstToken =
    sending && messages[messages.length - 1]?.role === "user";

  return (
    <div className="ai-tutor">
      <section className="ai-doc-pane">
        <div className="ai-pane-head">
          <h3>Tài liệu học tập</h3>
          {hasContext && (
            <button type="button" className="ghost" onClick={clearDocument}>
              Xoá tài liệu
            </button>
          )}
        </div>

        <div className="ai-upload-box">
          <div className="ai-upload-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="ai-file-input"
              onChange={(e) => void handleFileChange(e)}
            />
            <button
              type="button"
              className="primary"
              disabled={extracting}
              onClick={() => fileInputRef.current?.click()}
            >
              {extracting ? "Đang trích xuất PDF…" : "Tải file PDF lên"}
            </button>
          </div>
          <p className="ai-file-hint">
            Tải giáo trình/slide dạng PDF hoặc dán trực tiếp ghi chú vào khung
            bên dưới để hỏi AI Tutor.
          </p>
        </div>

        {uploadError && <p className="ai-error">{uploadError}</p>}

        {docMeta && (
          <div className="ai-file-card">
            <div className="ai-file-meta">
              <span className="ai-file-name" title={docMeta.fileName}>
                {docMeta.fileName}
              </span>
              <span className="ai-file-stats">
                {formatFileSize(docMeta.size)}
                {docMeta.pages ? ` · ${docMeta.pages} trang` : ""}
                {` · ${contextText.length.toLocaleString("vi-VN")} ký tự`}
              </span>
            </div>
          </div>
        )}

        <label className="ai-context-label" htmlFor="ai-tutor-context">
          <span>Nội dung ngữ cảnh gửi cho AI</span>
          <span>{contextText.length.toLocaleString("vi-VN")} ký tự</span>
        </label>
        <textarea
          id="ai-tutor-context"
          className="ai-context-input"
          value={contextText}
          onChange={(e) => setContextText(e.target.value)}
          placeholder="Nội dung trích xuất từ PDF sẽ hiển thị ở đây, hoặc bạn có thể tự dán đoạn bài học muốn AI giải thích…"
        />

        <div className="ai-prompts">
          <span className="ai-prompts-title">Gợi ý câu hỏi nhanh</span>
          <div className="ai-prompt-list">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                className="ai-prompt-chip"
                disabled={sending || !hasContext}
                onClick={() => void sendPrompt(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-chat-pane">
        <div className="ai-chat-header">
          <div className="ai-chat-status">
            <span className={`ai-status-pill ${hasContext ? "ready" : ""}`}>
              {hasContext
                ? docMeta
                  ? `Đang bám sát: ${docMeta.fileName}`
                  : "Đang dùng ngữ cảnh đã dán"
                : "Hỏi đáp tự do (chưa gắn tài liệu)"}
            </span>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="ghost"
              disabled={sending}
              onClick={() => {
                setMessages([]);
                setChatError("");
              }}
            >
              Làm mới hội thoại
            </button>
          )}
        </div>

        <div className="ai-messages">
          {messages.length === 0 ? (
            <div className="ai-empty">
              <h4>Trợ lý học tập AI Tutor</h4>
              <p>
                Tải file PDF bài giảng ở cột bên trái rồi đặt câu hỏi về bất kỳ
                phần nào bạn chưa hiểu, hoặc bấm các nút gợi ý nhanh để tóm tắt
                và tạo câu hỏi ôn tập.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`ai-msg ${msg.role}`}>
                <span className="ai-msg-meta">
                  {msg.role === "user" ? "Bạn" : "AI Tutor"} · {msg.createdAt}
                </span>
                <div
                  className={`ai-msg-bubble ${msg.role === "assistant" ? "ai-markdown" : ""}`}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}

          {waitingFirstToken && (
            <div className="ai-msg assistant">
              <span className="ai-msg-meta">AI Tutor</span>
              <div className="ai-msg-bubble thinking">
                Đang phân tích tài liệu và soạn câu trả lời…
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {chatError && <p className="ai-error">{chatError}</p>}

        <form className="ai-composer" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder={
              hasContext
                ? "Hỏi AI Tutor về nội dung tài liệu… (Enter để gửi, Shift+Enter xuống dòng)"
                : "Nhập câu hỏi học tập bất kỳ… (Enter để gửi)"
            }
          />
          {sending ? (
            <button type="button" onClick={stopGenerating}>
              Dừng
            </button>
          ) : (
            <button type="submit" className="primary" disabled={!input.trim()}>
              Gửi
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
