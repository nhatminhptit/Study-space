import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';

interface AskTutorBody {
  prompt: string;
  context?: string;
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
    return this.aiService.askTutor(body?.prompt, body?.context);
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
