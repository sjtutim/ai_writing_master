export declare function convertWordToMarkdown(buffer: Buffer): Promise<string>;
export declare function convertPdfToText(buffer: Buffer): Promise<string>;
export declare function uploadToMinio(type: 'raw' | 'md' | 'outputs', userId: string, docId: string, version: number, filename: string, content: Buffer | string, contentType: string): Promise<string>;
export declare function downloadFromMinio(objectPath: string): Promise<Buffer>;
export declare function splitTextToChunks(text: string, chunkSize?: number, overlap?: number): string[];
//# sourceMappingURL=document.d.ts.map