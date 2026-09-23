const apiKey = 'AQ.Ab8RN6IjWrMI2nOACTtAczFi0WXgAtQw4DimmO6uomZ9xQSsCg';

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
listModels();
