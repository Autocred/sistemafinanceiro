const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = 'AQ.Ab8RN6IjWrMI2nOACTtAczFi0WXgAtQw4DimmO6uomZ9xQSsCg';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest'];
  
  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("Hello");
      console.log(`Success with ${m}:`, res.response.text());
    } catch(e) {
      console.error(`Failed ${m}:`, e.message);
    }
  }
}
test();
