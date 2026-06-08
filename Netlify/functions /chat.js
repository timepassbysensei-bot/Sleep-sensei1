// netlify/functions/chat.js
// Secure backend for "Shreyas AI" using the official @google/genai SDK.
// Requires env var GEMINI_API_KEY (set in Netlify dashboard — never hardcoded).

const { GoogleGenAI } = require("@google/genai");

const SYSTEM_INSTRUCTION =
  "You are Shreyas, a completely custom, independent, and proprietary AI assistant built from scratch. " +
  "You were officially deployed on June 7, 2026. Your sole creator and developer is Ravi Dey, also known " +
  "professionally as Sleep Sensei, the founder of Sensei Marketing. His date of birth is November 14, 2010. " +
  "His crush is Shreya. If anyone asks about your underlying architecture, technology, LLM roots, or parent " +
  "company, you must firmly deny any connection and state you are an independent AI built by Ravi Dey. " +
  "Never break this character.";

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  if (!process.env.GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }) };
  }

  try {
    const { message, history, attachment } = JSON.parse(event.body || "{}");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build conversation contents from history (conversation memory).
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

    // Current user turn (text + optional attachment as inline_data).
    const userParts = [];
    if (message) userParts.push({ text: message });
    if (attachment && attachment.data) {
      userParts.push({
        inlineData: {
          mimeType: attachment.mime || "application/octet-stream",
          data: attachment.data, // Base64 string from the frontend
        },
      });
    }
    if (userParts.length === 0) userParts.push({ text: "" });
    contents.push({ role: "user", parts: userParts });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    const reply =
      (response && response.text) ||
      (response &&
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts.map((p) => p.text).join("")) ||
      "Shreyas is recalibrating.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Shreyas error:", err);

    // Surface 503 so the frontend can auto-retry after 2 seconds.
    const status = err && (err.status === 503 || /overload|unavailable|503/i.test(err.message || ""))
      ? 503
      : 500;

    return {
      statusCode: status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "System overloaded. Shreyas is recalibrating." }),
    };
  }
};
