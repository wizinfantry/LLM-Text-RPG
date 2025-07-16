// src/ollama_client.js

import axios from 'axios';

// The default URL for the Ollama server (typically when running locally)
const OLLAMA_BASE_URL = 'http://localhost:11434/api';

/**
 * Communicates with an Ollama model to get a response.
 * @param {string} prompt - The prompt to send to the model.
 * @param {string} model - The name of the Ollama model to use (e.g., 'gemma:2b', 'gemma3:latest').
 * @returns {Promise<string>} The response text from the Ollama model.
 */
export async function getGemmaResponse(prompt, model = 'gemma:2b') {
    try {
        const response = await axios.post(`${OLLAMA_BASE_URL}/generate`, {
            model: model,
            prompt: prompt,
            stream: false // Receive the response at once, not as a stream
        });

        // Extract the text from the 'response' field according to the Ollama API structure
        if (response.data && response.data.response) {
            return response.data.response;
        } else {
            console.warn("Ollama response format is unexpected:", response.data);
            return "Did not receive a valid response from Ollama.";
        }
    } catch (error) {
        console.error("Error during Ollama API call:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
            console.error("Response Status:", error.response.status);
            console.error("Response Headers:", error.response.headers);
        }
        return "Failed to call Ollama API. Make sure the Ollama server is running.";
    }
}