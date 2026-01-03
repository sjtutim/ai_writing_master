"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateText = generateText;
exports.streamText = streamText;
exports.testLLMConnection = testLLMConnection;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const openai = new openai_1.default({
    baseURL: config_1.config.deepseek.baseUrl,
    apiKey: config_1.config.deepseek.apiKey,
});
async function generateText(messages, options) {
    const completion = await openai.chat.completions.create({
        model: config_1.config.deepseek.model,
        messages,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
    });
    return {
        content: completion.choices[0]?.message?.content || '',
        tokens: completion.usage?.total_tokens || 0,
    };
}
async function* streamText(messages, options) {
    const stream = await openai.chat.completions.create({
        model: config_1.config.deepseek.model,
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
async function testLLMConnection() {
    try {
        const result = await generateText([
            { role: 'user', content: 'Say "connected" in one word.' },
        ], { maxTokens: 10 });
        console.log('LLM API connected successfully. Response:', result.content);
        return true;
    }
    catch (error) {
        console.error('LLM API connection failed:', error);
        return false;
    }
}
//# sourceMappingURL=llm.js.map