const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

async function findWorkingModel() {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
  });

  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-flash-latest"
  ];

  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      const response = await client.models.generateContent({
        model: model,
        contents: "Hello",
      });
      console.log(`✅ ${model} works! Response: ${response.text}`);
    } catch (e) {
      console.error(`❌ ${model} failed: ${e.message}`);
    }
  }
}

findWorkingModel();
