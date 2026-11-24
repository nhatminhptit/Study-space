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

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: GoogleGenAI | null = null;

  private getModelCandidates(): string[] {
    const preferred = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
    return [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
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

  private async generateWithFallback(
    contents: string,
    jsonMode = false,
  ): Promise<string> {
    const client = this.getClient();
    const candidates = this.getModelCandidates();
    let lastError: unknown;

    for (const model of candidates) {
      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: jsonMode
            ? { responseMimeType: 'application/json' }
            : undefined,
        });

        const text = response.text?.trim();
        if (text) return text;
        throw new Error(`Empty response from ${model}`);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Model ${model} failed, trying fallback...`);
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
  ): Promise<{ answer: string }> {
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt) {
      throw new BadRequestException('Nội dung câu hỏi không được để trống');
    }

    const fullPrompt = context?.trim()
      ? `Bạn là trợ lý học tập AI Tutor. Hãy trả lời bằng tiếng Việt rõ ràng, ngắn gọn dựa trên tài liệu sau.\n\nTài liệu tham khảo:\n${context.trim()}\n\nCâu hỏi của sinh viên:\n${cleanPrompt}`
      : `Bạn là trợ lý học tập AI Tutor. Hãy trả lời câu hỏi sau bằng tiếng Việt dễ hiểu, có ví dụ minh họa nếu cần:\n\n${cleanPrompt}`;

    const answer = await this.generateWithFallback(fullPrompt);
    return { answer };
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
