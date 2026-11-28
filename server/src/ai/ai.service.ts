import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

export interface MindmapNodeData {
  label: string;
  children?: MindmapNodeData[];
}

export interface FlashcardItem {
  question: string;
  answer: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
];

const MAX_CONTEXT_CHARS = 60000;
const MAX_HISTORY_TURNS = 10;
const FIRST_TOKEN_TIMEOUT_MS = 10000;
const GENERATE_TIMEOUT_MS = 20000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenAI | null = null;
  private lastWorkingModel: string | null = null;

  private getModelCandidates(): string[] {
    const preferred = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
    const ordered = [
      ...(this.lastWorkingModel ? [this.lastWorkingModel] : []),
      preferred,
      ...FALLBACK_MODELS,
    ];
    return Array.from(new Set(ordered));
  }

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Chưa cấu hình GEMINI_API_KEY trong server/.env',
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  private buildTutorPrompt(
    prompt: string,
    context?: string,
    history?: ChatHistoryItem[],
  ): string {
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt) {
      throw new BadRequestException('Nội dung câu hỏi không được để trống');
    }

    const cleanContext = context?.trim().slice(0, MAX_CONTEXT_CHARS);
    const validHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === 'user' || item.role === 'assistant') &&
              typeof item.content === 'string' &&
              item.content.trim().length > 0,
          )
          .slice(-MAX_HISTORY_TURNS)
      : [];

    const parts: string[] = [
      'Bạn là trợ lý học tập AI Tutor cho sinh viên. Hãy trả lời bằng tiếng Việt rõ ràng, súc tích, đi thẳng vào trọng tâm, dễ hiểu và có cấu trúc hợp lý.',
    ];

    if (cleanContext) {
      parts.push(
        `Ưu tiên bám sát tài liệu tham khảo dưới đây. Nếu thông tin không có trong tài liệu, hãy nói rõ rồi mới bổ sung kiến thức chung.\n\n--- TÀI LIỆU THAM KHẢO ---\n${cleanContext}\n--- HẾT TÀI LIỆU ---`,
      );
    }

    if (validHistory.length > 0) {
      const transcript = validHistory
        .map(
          (item) =>
            `${item.role === 'user' ? 'Sinh viên' : 'AI Tutor'}: ${item.content.trim()}`,
        )
        .join('\n');
      parts.push(`--- LỊCH SỬ HỘI THOẠI GẦN ĐÂY ---\n${transcript}`);
    }

    parts.push(`Câu hỏi hiện tại của sinh viên:\n${cleanPrompt}`);
    return parts.join('\n\n');
  }

  private async callModelWithTimeout(
    model: string,
    contents: string,
    jsonMode: boolean,
  ): Promise<string> {
    const client = this.getClient();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Timeout sau ${GENERATE_TIMEOUT_MS}ms`));
      }, GENERATE_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([
        client.models.generateContent({
          model,
          contents,
          config: {
            abortSignal: controller.signal,
            ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        timeoutPromise,
      ]);

      const text = response.text?.trim();
      if (!text) {
        throw new Error(`Phản hồi rỗng từ ${model}`);
      }
      return text;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async openStreamWithTimeout(
    model: string,
    contents: string,
    externalSignal?: AbortSignal,
  ) {
    const client = this.getClient();
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Timeout sau ${FIRST_TOKEN_TIMEOUT_MS}ms`));
      }, FIRST_TOKEN_TIMEOUT_MS);
    });

    try {
      return await Promise.race([
        (async () => {
          const stream = await client.models.generateContentStream({
            model,
            contents,
            config: { abortSignal: controller.signal },
          });
          const iterator = stream[Symbol.asyncIterator]();
          while (true) {
            const step = await iterator.next();
            if (step.done) {
              throw new Error(`Stream rỗng từ ${model}`);
            }
            const firstText = step.value.text ?? '';
            if (firstText.length > 0) {
              return { firstText, iterator };
            }
          }
        })(),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async generateWithFallback(
    contents: string,
    jsonMode = false,
  ): Promise<string> {
    const candidates = this.getModelCandidates();
    let lastError: unknown;

    for (const model of candidates) {
      this.logger.log(`Trying model: ${model}`);
      try {
        const text = await this.callModelWithTimeout(model, contents, jsonMode);
        this.lastWorkingModel = model;
        this.logger.log(`Answered using model: ${model}`);
        return text;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Model ${model} failed (${msg}), trying fallback...`);
      }
    }

    this.logger.error('All Gemini models failed', lastError);
    throw new InternalServerErrorException(
      'Không thể gọi Google Gemini API. Vui lòng kiểm tra API key hoặc thử lại sau.',
    );
  }

  private parseJsonSafely<T>(rawText: string): T {
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    return JSON.parse(cleaned) as T;
  }

  async askTutor(
    prompt: string,
    context?: string,
    history?: ChatHistoryItem[],
  ): Promise<{ answer: string }> {
    const fullPrompt = this.buildTutorPrompt(prompt, context, history);
    const answer = await this.generateWithFallback(fullPrompt);
    return { answer };
  }

  async *streamTutor(
    prompt: string,
    context?: string,
    history?: ChatHistoryItem[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const fullPrompt = this.buildTutorPrompt(prompt, context, history);
    const candidates = this.getModelCandidates();
    let lastError: unknown;

    for (const model of candidates) {
      if (signal?.aborted) return;
      this.logger.log(`Streaming with model: ${model}`);
      try {
        const { firstText, iterator } = await this.openStreamWithTimeout(
          model,
          fullPrompt,
          signal,
        );
        this.lastWorkingModel = model;
        yield firstText;

        while (!signal?.aborted) {
          const step = await iterator.next();
          if (step.done) break;
          const chunkText = step.value.text ?? '';
          if (chunkText) yield chunkText;
        }
        return;
      } catch (error) {
        if (signal?.aborted) return;
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Stream ${model} failed (${msg}), trying fallback...`);
      }
    }

    this.logger.error('All Gemini models failed (stream)', lastError);
    throw new InternalServerErrorException(
      'AI Tutor đang quá tải hoặc không phản hồi. Vui lòng thử lại sau vài giây.',
    );
  }

  async generateMindmap(content: string): Promise<MindmapNodeData> {
    const cleanContent = content?.trim();
    if (!cleanContent) {
      throw new BadRequestException('Nội dung tài liệu không được để trống');
    }

    const prompt = `Tóm tắt nội dung sau thành một sơ đồ tư duy (mindmap) bằng tiếng Việt.
Chỉ trả về JSON hợp lệ theo đúng cấu trúc đệ quy sau, không thêm giải thích:
{
  "label": "Chủ đề chính",
  "children": [
    {
      "label": "Ý chính 1",
      "children": [{ "label": "Ý phụ 1.1" }]
    }
  ]
}

Nội dung:
${cleanContent}`;

    const text = await this.generateWithFallback(prompt, true);
    return this.parseJsonSafely<MindmapNodeData>(text);
  }

  async generateFlashcards(
    content: string,
    count = 5,
  ): Promise<{ flashcards: FlashcardItem[] }> {
    const cleanContent = content?.trim();
    if (!cleanContent) {
      throw new BadRequestException('Nội dung tài liệu không được để trống');
    }

    const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20);
    const prompt = `Tạo đúng ${safeCount} thẻ ghi nhớ (flashcard) ôn tập bằng tiếng Việt từ nội dung sau.
Chỉ trả về một mảng JSON hợp lệ theo cấu trúc:
[
  { "question": "Câu hỏi ngắn gọn", "answer": "Đáp án súc tích" }
]

Nội dung:
${cleanContent}`;

    const text = await this.generateWithFallback(prompt, true);
    const flashcards = this.parseJsonSafely<FlashcardItem[]>(text);
    return { flashcards };
  }
}
