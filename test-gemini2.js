const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = 'AIzaSyAThisIsAFakeKeyForTestingPurpose123';
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-1.5-flash'];
  
  for (const m of models) {
    try {
      console.log(`Testing ${m} with Fake Key...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("Hello");
      console.log(`Success with ${m}:`, res.response.text());
    } catch(e) {
      console.error(`Failed ${m}:`, e.message);
    }
  }
}
test();
