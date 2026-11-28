import { Body, Controller, HttpException, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService, type ChatHistoryItem } from './ai.service.js';

interface AskTutorBody {
  prompt: string;
  context?: string;
  history?: ChatHistoryItem[];
}

interface GenerateMindmapBody {
  content: string;
}

interface GenerateFlashcardsBody {
  content: string;
  count?: number;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  askTutor(@Body() body: AskTutorBody) {
    return this.aiService.askTutor(body?.prompt, body?.context, body?.history);
  }

  @Post('chat/stream')
  async askTutorStream(@Body() body: AskTutorBody, @Res() res: Response) {
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    try {
      const stream = this.aiService.streamTutor(
        body?.prompt,
        body?.context,
        body?.history,
        controller.signal,
      );

      let started = false;
      for await (const chunk of stream) {
        if (!started) {
          res.status(200);
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders();
          started = true;
        }
        if (res.writableEnded) break;
        res.write(chunk);
      }

      if (!started && !controller.signal.aborted && !res.headersSent) {
        res.status(502).json({
          message: 'AI không trả về nội dung. Vui lòng thử lại.',
        });
        return;
      }

      if (!res.writableEnded) {
        res.end();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }

      const status = error instanceof HttpException ? error.getStatus() : 500;
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể gọi Google Gemini API.';

      if (!res.headersSent) {
        res.status(status).json({ message });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }

  @Post('mindmap')
  generateMindmap(@Body() body: GenerateMindmapBody) {
    return this.aiService.generateMindmap(body?.content);
  }

  @Post('flashcards')
  generateFlashcards(@Body() body: GenerateFlashcardsBody) {
    return this.aiService.generateFlashcards(body?.content, body?.count);
  }
}
