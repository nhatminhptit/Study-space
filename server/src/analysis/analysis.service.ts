import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { PdfService } from '../document/pdf.service.js';
import { sanitizeMindmap, type MindmapNode } from './mindmap-tree.js';

export interface DocumentAnalysis {
  fileName: string;
  title: string;
  numPages: number;
  charCount: number;
  truncated: boolean;
  summary: string;
  mindmap: MindmapNode;
}

// Keep the prompt small enough for the model and fast to answer
export const MAX_AI_TEXT_LENGTH = 30_000;

const SUMMARY_QUESTION =
  'Tóm tắt nội dung chính của tài liệu trên trong 2-3 câu tiếng Việt. Chỉ trả về đoạn tóm tắt, không thêm tiêu đề hay gạch đầu dòng.';

const AI_ERROR = 'AI không phân tích được tài liệu, vui lòng thử lại sau';

/*
 * Full AI flow for one PDF: extract text -> ask AI for mindmap json and
 * summary -> clean the json so the client can render it right away.
 */
@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly aiService: AiService,
  ) {}

  async analyzePdf(
    buffer: Buffer,
    fileName: string,
  ): Promise<DocumentAnalysis> {
    const pdf = await this.pdfService.extractText(buffer, fileName);

    const truncated = pdf.text.length > MAX_AI_TEXT_LENGTH;
    const content = truncated
      ? pdf.text.slice(0, MAX_AI_TEXT_LENGTH)
      : pdf.text;

    // Both AI calls run at the same time, summary is optional
    const [mindmap, summary] = await Promise.all([
      this.buildMindmap(`Tiêu đề: ${pdf.title}\n\n${content}`),
      this.buildSummary(content),
    ]);

    return {
      fileName,
      title: pdf.title,
      numPages: pdf.numPages,
      charCount: pdf.charCount,
      truncated,
      summary,
      mindmap,
    };
  }

  private async buildMindmap(content: string): Promise<MindmapNode> {
    let raw: unknown;
    try {
      raw = await this.aiService.generateMindmap(content);
    } catch (error) {
      throw this.toAiError(error);
    }

    const mindmap = sanitizeMindmap(raw);
    if (!mindmap) {
      this.logger.warn('AI returned a mindmap without usable root');
      throw new BadGatewayException('AI trả về sơ đồ tư duy không hợp lệ');
    }
    return mindmap;
  }

  private async buildSummary(content: string): Promise<string> {
    try {
      const { answer } = await this.aiService.askTutor(
        SUMMARY_QUESTION,
        content,
      );
      return answer.trim();
    } catch (error) {
      this.logger.warn(`Summary failed: ${(error as Error).message}`);
      return '';
    }
  }

  // AI failures (model down, bad json) are upstream errors -> 502
  private toAiError(error: unknown): HttpException {
    if (error instanceof InternalServerErrorException) {
      return new BadGatewayException(error.message || AI_ERROR);
    }
    if (error instanceof HttpException) return error;
    this.logger.warn(`Mindmap failed: ${(error as Error)?.message}`);
    return new BadGatewayException(AI_ERROR);
  }
}
