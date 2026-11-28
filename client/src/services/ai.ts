import { API_URL, TOKEN_STORAGE_KEY } from "../config";

export interface TutorMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export interface ExtractedDocument {
  fileName: string;
  size: number;
  text: string;
  pages?: number;
}

async function parseErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(", ");
    if (typeof data.message === "string" && data.message.trim())
      return data.message;
  } catch {
    // ignore invalid json
  }
  return fallback;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function extractPdfDocument(
  file: File,
): Promise<ExtractedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/documents/extract`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const msg = await parseErrorMessage(
      res,
      "Không thể trích xuất nội dung file PDF.",
    );
    throw new Error(msg);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const text =
    (typeof raw.text === "string" && raw.text) ||
    (typeof raw.content === "string" && raw.content) ||
    (typeof raw.extractedText === "string" && raw.extractedText) ||
    "";

  const pages =
    (typeof raw.pages === "number" && raw.pages) ||
    (typeof raw.numPages === "number" && raw.numPages) ||
    (typeof raw.numpages === "number" && raw.numpages) ||
    (typeof raw.pageCount === "number" && raw.pageCount) ||
    undefined;

  return {
    fileName: typeof raw.fileName === "string" ? raw.fileName : file.name,
    size: typeof raw.size === "number" ? raw.size : file.size,
    text: text.trim(),
    pages,
  };
}

export async function askAiTutor(params: {
  prompt: string;
  context?: string;
  history?: TutorMessagePayload[];
}): Promise<string> {
  const res = await fetch(`${API_URL}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const msg = await parseErrorMessage(
      res,
      "AI Tutor hiện không phản hồi. Vui lòng thử lại.",
    );
    throw new Error(msg);
  }

  const data = (await res.json()) as { answer?: string };
  return data.answer?.trim() || "AI chưa trả về nội dung.";
}

export async function askAiTutorStream(
  params: {
    prompt: string;
    context?: string;
    history?: TutorMessagePayload[];
  },
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${API_URL}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    const msg = await parseErrorMessage(
      res,
      "AI Tutor hiện không phản hồi. Vui lòng thử lại.",
    );
    throw new Error(msg);
  }

  if (!res.body) {
    const fullText = await res.text();
    onChunk(fullText);
    return fullText;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onChunk(chunk);
    }
  }

  const tail = decoder.decode();
  if (tail) {
    full += tail;
    onChunk(tail);
  }

  return full.trim();
}
