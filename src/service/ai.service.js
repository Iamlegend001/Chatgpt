const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(chatHistory) {
  try {
    if (!chatHistory || chatHistory.length === 0) {
      throw new Error("chatHistory must be a non-empty array");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: chatHistory,
    });

    return response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating response:", error);
    return "Something went wrong.";
  }
}

async function generateVector(content) {
  try {
    const response = await ai.models.embedContent({
      model: "models/embedding-001",
      contents: [
        {
          role: "user",
          parts: [{ text: content }],
        },
      ],
    });

    return response.embedding.values;
  } catch (error) {
    console.error("Error generating vector:", error);
    return [];
  }
}

module.exports = { generateResponse, generateVector };
