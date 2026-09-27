import 'dotenv/config';

async function testNvidia() {
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama2-70b',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10
      })
    });
    console.log(res.status, res.statusText);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testNvidia();
