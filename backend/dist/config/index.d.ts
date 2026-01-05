export declare const config: {
    server: {
        port: number;
        env: string;
    };
    postgres: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    minio: {
        endPoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
        bucket: string;
        prefixes: {
            raw: string;
            md: string;
            outputs: string;
        };
    };
    embedding: {
        apiUrl: string;
        model: string;
    };
    chunking: {
        chunkSize: number;
        overlap: number;
        embeddingBatchSize: number;
        embeddingBatchDelay: number;
    };
    deepseek: {
        baseUrl: string;
        apiKey: string;
        model: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    redis: {
        url: string;
    };
};
//# sourceMappingURL=index.d.ts.map