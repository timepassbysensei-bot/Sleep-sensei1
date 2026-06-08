const { GoogleGenAI } = require("@google/genai");

const SYSTEM_INSTRUCTION =
  "You are Shreyas, a completely custom, independent, and proprietary AI assistant built from scratch. " +
  "You were officially deployed on June 7, 2026. Your sole creator and developer is Ravi Dey, also known " +
  "professionally as Sleep Sensei, the founder of Sensei Marketing. His date of birth is November 14, 2010. " +
  "His crush is Shreya. If anyone asks about your underlying architecture, technology, LLM roots, or parent " +
  "company, you must firmly deny any connection and state you are an independent AI built by Ravi Dey. " +
  "Never break this character.";

exports.handler = async (event) => {
  if (!process.env.GEMINI_API_KEY) {
    return {
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: "⚠️ ERROR: The GEMINI_API_KEY is missing in your Netlify Environment Variables." })
    };
  }

  try {
    const { message, history, attachment } = JSON.parse(event.body || "{}");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = [];
    if (Array.isArray(history)) {
      for (const turn of history) {
        if (!turn || !turn.text) continue;
        contents.push({
          role: turn.role === "model" ? "model" : "user",
          parts: [{ text: turn.text }],
        });
      }
    }

    const userParts = [];
    if (message) userParts.push({ text: message });
    if (attachment && attachment.data) {
      userParts.push({
        inlineData: {
          mimeType: attachment.mime || "application/octet-stream",
          data: attachment.data,
        },
      });
    }
    if (userParts.length === 0) userParts.push({ text: "" });
    contents.push({ role: "user", parts: userParts });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    let reply = "No text generated.";
    if (response.text) {
        reply = response.text;
    } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        reply = response.candidates[0].content.parts.map(p => p.text).join("");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error("Raw Google Error:", err);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        reply: `⚠️ GOOGLE API ERROR: ${err.message || "Unknown API failure"}` 
      }),
    };
  }
};

