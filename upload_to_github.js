const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function pushFiles() {
  console.log("Starting upload to GitHub...");
  const repo = "JlidaMohammedAmine/rulebreak-app";
  const token = execSync('"C:\\Program Files\\GitHub CLI\\gh.exe" auth token').toString().trim();
  
  function getFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (let file of list) {
      if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'mingit.zip' || file === '.env.local') continue;
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  const allFiles = getFiles(process.cwd());
  let tree = [];
  
  for (let file of allFiles) {
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    console.log(`Adding ${relativePath}`);
    const res = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: fs.readFileSync(file).toString('base64'),
        encoding: 'base64'
      })
    });
    const blob = await res.json();
    if (blob.sha) {
        tree.push({ path: relativePath, mode: '100644', type: 'blob', sha: blob.sha });
    } else {
        console.error("Blob error:", blob);
    }
  }
  
  console.log("Getting latest commit...");
  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/main`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;
  
  const commitResOrig = await fetch(`https://api.github.com/repos/${repo}/git/commits/${latestCommitSha}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const commitOrigData = await commitResOrig.json();
  const baseTreeSha = commitOrigData.tree.sha;
  
  console.log("Creating tree...", tree.length, "files");
  const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: tree })
  });
  const treeData = await treeRes.json();
  if (!treeData.sha) {
      console.error("Tree error:", treeData);
      return;
  }
  
  console.log("Creating commit...");
  const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Upload project files",
      tree: treeData.sha,
      parents: [latestCommitSha]
    })
  });
  const commitData = await commitRes.json();
  if (!commitData.sha) {
      console.error("Commit error:", commitData);
      return;
  }
  
  console.log("Updating refs/heads/main...", commitData.sha);
  const patchRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/main`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commitData.sha })
  });
  const patchData = await patchRes.json();
  console.log("Patch response:", patchData);
  console.log("Done!");
}

pushFiles().catch(console.error);
