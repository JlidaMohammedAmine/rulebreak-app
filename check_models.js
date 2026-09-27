const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

async function checkModels() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
  });

  try {
    const models = await client.models.list();
    for await (const model of models) {
        console.log(model.name);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

checkModels();
