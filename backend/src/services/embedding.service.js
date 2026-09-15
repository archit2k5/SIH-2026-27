import axios from "axios";
import { Logger } from "../utils/logger.js";

export class EmbeddingService {
    static async generateEmbedding(text) {
        if (!text || !text.trim()) {
            throw new Error("Text is required for embedding");
        }

        const AI_NLP_SERVICE_URL =
            process.env.AI_NLP_SERVICE_URL ||
            "http://localhost:8000";

        try {
            const response = await axios.post(
                `${AI_NLP_SERVICE_URL}/internal/embeddings`,
                {
                    text,
                }
            );

            if (
                !response.data?.success ||
                !Array.isArray(response.data.embedding)
            ) {
                throw new Error(
                    "Invalid embedding response from AI/NLP service"
                );
            }

            return response.data.embedding;
        } catch (error) {
            Logger.error(
                `Embedding generation failed: ${error.message}`
            );

            throw new Error(
                "Failed to generate document embedding"
            );
        }
    }
}