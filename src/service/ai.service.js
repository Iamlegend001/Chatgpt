const { GoogleGenAI } = require("@google/genai");
const { response } = require("express");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(chatHistory) {
  try {
    if (!chatHistory || chatHistory.length === 0) {
      throw new Error("chatHistory must be a non-empty array");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: chatHistory,
    });

    // Check if response exists and has the expected structure
    if (
      response &&
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0]
    ) {
      return response.candidates[0].content.parts[0].text;
    } else {
      console.warn("Unexpected response structure:", response);
      return "Sorry, I couldn't generate a response.";
    }
  } catch (error) {
    console.error("Error generating response:", error);
    return "Something went wrong.";
  }
}

async function generateVector(content) {
  try {
    if (!content || typeof content !== "string") {
      throw new Error("Content must be a non-empty string");
    }

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [
        {
          role: "user",
          parts: [{ text: content }],
        },
      ],
      config: {
        outputDimensionality: 768,
      },
    });

    // Debug: Log the full response to understand the structure
    console.log(
      "🔍 Full embedding response:",
      JSON.stringify(response, null, 2)
    );

    // Try different possible response structures
    if (response && response.embedding && response.embedding.values) {
      return response.embedding[0].values;
    } else if (response && response.values) {
      return response.values;
    } else if (response && Array.isArray(response)) {
      return response;
    } else {
      console.warn("⚠️ Unexpected embedding response structure:", response);
      return [];
    }
  } catch (error) {
    console.error("❌ Error generating vector:", error.message);
    console.error("❌ Full error:", error);
    return [];
  }
}

module.exports = { generateResponse, generateVector };
