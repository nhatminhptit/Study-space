import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { DocumentModule } from '../document/document.module.js';
import { AnalysisController } from './analysis.controller.js';
import { AnalysisService } from './analysis.service.js';

// Glue module: PDF upload (DocumentModule) + Gemini (AiModule)
@Module({
  imports: [DocumentModule, AiModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
