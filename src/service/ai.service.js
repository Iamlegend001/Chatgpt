const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateResponse(content) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: content }] }],
    });

    return response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating response:", error);
    return "Something went wrong.";
  }
}

module.exports = { generateResponse };
