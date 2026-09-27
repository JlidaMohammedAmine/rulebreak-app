try {
  const rsc = require('ai/rsc');
  console.log("ai/rsc exists", Object.keys(rsc));
} catch (e) {
  console.error("ai/rsc does not exist", e.message);
}
