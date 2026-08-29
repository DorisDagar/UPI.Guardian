require("dotenv").config();

async function testGemini() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY was not found in the .env file.");
    }

    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    console.log("Sending a test request to Gemini...");

    const interaction = await ai.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
      input:
        "Reply with exactly this sentence: Gemini is connected to UPI Guardian.",
      store: false,
    });

    console.log("\nGemini response:");
    console.log(interaction.output_text);
    console.log("\n✅ Gemini connection successful.");
  } catch (error) {
    console.error("\n❌ Gemini connection failed.");
    console.error(error.message);
  }
}

testGemini();