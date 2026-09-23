const apiKey = 'AQ.Ab8RN6IjWrMI2nOACTtAczFi0WXgAtQw4DimmO6uomZ9xQSsCg';

async function listModels() {
  let token = '';
  do {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}${token ? '&pageToken=' + token : ''}`);
      const data = await res.json();
      data.models?.forEach(m => console.log(m.name));
      token = data.nextPageToken || '';
    } catch (err) {
      console.error(err);
      token = '';
    }
  } while (token);
}
listModels();
