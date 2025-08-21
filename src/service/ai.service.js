
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(chatHistory) {
  try {
    // Convert chatHistory array to the format expected by the API
    const contents = chatHistory.map(message => ({
      role: message.role === "model" ? "model" : "user",
      parts: message.parts
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
    });

    return response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating response:", error);
    return "Something went wrong.";
  }
}

module.exports = { generateResponse };