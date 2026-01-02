import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  baseURL: config.deepseek.baseUrl,
  apiKey: config.deepseek.apiKey,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateText(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ content: string; tokens: number }> {
  const completion = await openai.chat.completions.create({
    model: config.deepseek.model,
    messages,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.7,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    tokens: completion.usage?.total_tokens || 0,
  };
}

export async function* streamText(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): AsyncGenerator<string, { tokens: number }> {
  const stream = await openai.chat.completions.create({
    model: config.deepseek.model,
    messages,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.7,
    stream: true,
  });

  let totalContent = '';
  let totalTokens = 0;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      totalContent += content;
      yield content;
    }
    if (chunk.usage) {
      totalTokens = chunk.usage.total_tokens || 0;
    }
  }

  return { tokens: totalTokens };
}

export async function testLLMConnection(): Promise<boolean> {
  try {
    const result = await generateText([
      { role: 'user', content: 'Say "connected" in one word.' },
    ], { maxTokens: 10 });
    console.log('LLM API connected successfully. Response:', result.content);
    return true;
  } catch (error) {
    console.error('LLM API connection failed:', error);
    return false;
  }
}
