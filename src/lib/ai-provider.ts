import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { getConfiguracoes } from './storage';
import { getFirebaseAuth } from './auth';

export type AIProviderName = 'gemini' | 'openai' | 'anthropic' | 'offline';

export interface AIResponse {
  text: string;
  providerUsed: AIProviderName;
  modelUsed: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderOptions {
  systemPrompt?: string;
  temperature?: number;
  retries?: number;
  timeoutMs?: number;
}

export class AIProviderService {
  private async getConfig() {
    let uid = 'app';
    if (typeof window !== 'undefined') {
      const auth = getFirebaseAuth();
      const isBypassAtivo = (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
      uid = isBypassAtivo ? 'clovis-master-bypass' : (auth.currentUser?.uid || 'app');
    }
    return await getConfiguracoes(uid);
  }

  /**
   * Helper for fetch with timeout
   */
  private async fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number }) {
    const { timeout = 15000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  }

  /**
   * Main entry for parsing an image to JSON
   */
  public async analyzeImage(
    base64Data: string,
    mimeType: string,
    prompt: string,
    options?: AIProviderOptions
  ): Promise<AIResponse> {
    const config = await this.getConfig();
    const preferredProvider = (config.provedorIA as AIProviderName) || 'gemini';
    
    const retries = options?.retries ?? 2;
    const timeoutMs = options?.timeoutMs ?? 30000;
    
    // Providers fallback sequence based on what is available
    const providersSequence: AIProviderName[] = [];
    if (preferredProvider === 'openai' && config.openaiApiKey) providersSequence.push('openai');
    if (preferredProvider === 'gemini' && config.geminiApiKey) providersSequence.push('gemini');
    
    // Add fallbacks
    if (!providersSequence.includes('gemini') && config.geminiApiKey) providersSequence.push('gemini');
    if (!providersSequence.includes('openai') && config.openaiApiKey) providersSequence.push('openai');

    if (providersSequence.length === 0) {
      throw new Error('Nenhuma chave de IA foi configurada. Acesse as Configurações para adicionar uma chave do Google Gemini ou OpenAI.');
    }

    const errorMsgs = [];
    for (let attempt = 0; attempt < retries; attempt++) {
      for (const provider of providersSequence) {
        try {
          if (provider === 'gemini') {
            return await this.callGeminiVision(base64Data, mimeType, prompt, config.geminiApiKey!, options, timeoutMs);
          } else if (provider === 'openai') {
            return await this.callOpenAIVision(base64Data, mimeType, prompt, config.openaiApiKey!, options, timeoutMs);
          }
        } catch (error: any) {
          console.warn(`[AI Provider] Falha com provedor ${provider} na tentativa ${attempt + 1}:`, error.message);
          errorMsgs.push(`${provider}: ${error.message}`);
        }
      }
    }
    
    throw new Error(`Falha após múltiplas tentativas. Erros: ${errorMsgs.join(' | ')}`);
  }

  private async callGeminiVision(
    base64Data: string,
    mimeType: string,
    prompt: string,
    apiKey: string,
    options?: AIProviderOptions,
    timeoutMs: number = 30000
  ): Promise<AIResponse> {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const modelsToTry = [
        'gemini-1.5-flash', 
        'gemini-1.5-flash-latest', 
        'gemini-1.5-pro', 
        'gemini-1.0-pro-vision-latest',
        'gemini-pro-vision'
      ];
      
      let errors: string[] = [];
      for (const modelName of modelsToTry) {
        try {
          const modelOptions: any = { model: modelName };
          
          const isOldVision = modelName.includes('vision');
          
          if (options?.systemPrompt && !isOldVision) {
            modelOptions.systemInstruction = options.systemPrompt;
          }
          const model = genAI.getGenerativeModel(modelOptions);
          
          const finalPrompt = (options?.systemPrompt && isOldVision) 
            ? `${options.systemPrompt}\n\n${prompt}`
            : prompt;
            
          const contents = [
            {
              role: 'user',
              parts: [
                { text: finalPrompt },
                { inlineData: { data: base64Data, mimeType } }
              ]
            }
          ];
  
          const result = await model.generateContent({
             contents,
             generationConfig: { temperature: options?.temperature ?? 0.1 }
          });
          
          const response = await result.response;
          const text = response.text();
          
          return {
            text,
            providerUsed: 'gemini',
            modelUsed: modelName,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          };
        } catch (error: any) {
          console.warn(`Gemini Model ${modelName} falhou:`, error.message);
          errors.push(`[${modelName}]: ${error.message}`);
        }
      }
      throw new Error(`[SISTEMA ATUALIZADO V2] Gemini esgotou todos os modelos. Detalhes: ${errors.join(' | ')}`);
  }

  private async callOpenAIVision(
    base64Data: string,
    mimeType: string,
    prompt: string,
    apiKey: string,
    options?: AIProviderOptions,
    timeoutMs: number = 30000
  ): Promise<AIResponse> {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, timeout: timeoutMs });
    
    const messages: any[] = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
      ]
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: options?.temperature ?? 0.1,
    });

    return {
      text: response.choices[0].message.content || '',
      providerUsed: 'openai',
      modelUsed: 'gpt-4o-mini',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      }
    };
  }
}

export const aiProvider = new AIProviderService();

