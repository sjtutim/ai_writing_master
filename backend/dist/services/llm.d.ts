export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare function generateText(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
}): Promise<{
    content: string;
    tokens: number;
}>;
export declare function streamText(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
}): AsyncGenerator<string, {
    tokens: number;
}>;
export declare function testLLMConnection(): Promise<boolean>;
//# sourceMappingURL=llm.d.ts.map