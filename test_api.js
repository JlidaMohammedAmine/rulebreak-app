

async function testExtract() {
  const policyText = "Walmart respects your privacy. We do not sell your data to third parties. If you return an item, you must do so within 30 days.";
  
  console.log("Testing /api/policy/extract...");
  const res = await fetch('http://localhost:3000/api/policy/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policyText })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testExtract();
