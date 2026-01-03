"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.getEmbeddings = getEmbeddings;
exports.testEmbeddingConnection = testEmbeddingConnection;
const config_1 = require("../config");
async function getEmbedding(text) {
    const response = await fetch(config_1.config.embedding.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config_1.config.embedding.model,
            input: text,
        }),
    });
    if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.data[0].embedding;
}
async function getEmbeddings(texts) {
    const response = await fetch(config_1.config.embedding.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config_1.config.embedding.model,
            input: texts,
        }),
    });
    if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.map((d) => d.embedding);
}
async function testEmbeddingConnection() {
    try {
        const embedding = await getEmbedding('test connection');
        console.log('Embedding API connected successfully. Vector dimension:', embedding.length);
        return true;
    }
    catch (error) {
        console.error('Embedding API connection failed:', error);
        return false;
    }
}
//# sourceMappingURL=embedding.js.map