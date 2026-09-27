import { AnalysisSession } from "@/types";

export function generateMarkdownReport(session: AnalysisSession): string {
  const { policy, findings, rules, scenarios, evaluations, patches } = session;

  const date = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const highFindings = findings.filter(f => f.severity === "HIGH").length;
  const mediumFindings = findings.filter(f => f.severity === "MEDIUM").length;
  const lowFindings = findings.filter(f => f.severity === "LOW").length;

  const passedScenarios = evaluations.filter(e => e.status === "PASS").length;
  const failedScenarios = evaluations.length - passedScenarios;

  let md = `# RuleBreak Analysis Report\n\n`;
  md += `**Generated:** ${date}\n`;
  if (policy) {
    md += `**Document Analyzed:** ${policy.title || 'Untitled Policy'}\n`;
  }
  md += `\n---\n\n`;

  // 1. Executive Summary
  md += `## 1. Executive Summary\n\n`;
  md += `The analysis extracted **${rules.length}** distinct rules and generated **${scenarios.length}** adversarial test scenarios. `;
  md += `Of these scenarios, **${passedScenarios}** passed and **${failedScenarios}** identified potential issues.\n\n`;
  
  md += `### Vulnerability Breakdown\n`;
  md += `- **High Severity:** ${highFindings}\n`;
  md += `- **Medium Severity:** ${mediumFindings}\n`;
  md += `- **Low Severity:** ${lowFindings}\n\n`;
  
  if (findings.length === 0) {
    md += `*No vulnerabilities or logic flaws were identified in the policy.* ✅\n\n`;
  }

  // 2. Detailed Findings
  if (findings.length > 0) {
    md += `## 2. Detailed Findings\n\n`;
    
    findings.sort((a, b) => {
      const sevWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return sevWeight[b.severity] - sevWeight[a.severity];
    }).forEach((finding, idx) => {
      md += `### ${idx + 1}. [${finding.severity}] ${finding.type.replace(/_/g, ' ')}\n\n`;
      md += `**Description:** ${finding.description}\n\n`;
      
      // Clean evidence (replace Rxx with actual rule)
      let cleanedEvidence = finding.evidence;
      const ruleMatches = cleanedEvidence.match(/R\d{2}/g);
      if (ruleMatches) {
        ruleMatches.forEach(ruleId => {
          const rule = rules.find(r => r.id === ruleId);
          if (rule) {
            cleanedEvidence = cleanedEvidence.replace(ruleId, `*[${rule.category.replace(/_/g, ' ')}: "${rule.statement}"]*`);
          }
        });
      }
      md += `**Evidence:** ${cleanedEvidence}\n\n`;

      const patch = patches.find(p => p.findingId === finding.id);
      if (patch) {
        md += `#### Proposed Patch\n`;
        md += `> ${patch.explanation}\n\n`;
        md += `**Original:**\n\`\`\`\n${patch.originalText}\n\`\`\`\n\n`;
        md += `**Proposed:**\n\`\`\`\n${patch.proposedText}\n\`\`\`\n\n`;
      }
      
      md += `---\n\n`;
    });
  }

  // 3. Extracted Rules
  if (rules.length > 0) {
    md += `## 3. Extracted Rules\n\n`;
    md += `| ID | Category | Statement |\n`;
    md += `|---|---|---|\n`;
    rules.forEach(rule => {
      md += `| \`${rule.id}\` | ${rule.category} | ${rule.statement.replace(/\n/g, ' ')} |\n`;
    });
    md += `\n`;
  }

  // 4. Test Scenarios
  if (scenarios.length > 0) {
    md += `## 4. Scenario Lab Results\n\n`;
    scenarios.forEach(scenario => {
      const evaluation = evaluations.find(e => e.scenarioId === scenario.id);
      const status = evaluation ? evaluation.status : 'UNTESTED';
      
      md += `### Scenario ${scenario.id}: ${status}\n`;
      md += `- **Type:** ${scenario.type}\n`;
      md += `- **Narrative:** ${scenario.narrative}\n`;
      
      if (evaluation && evaluation.reasoning && status !== 'PASS') {
        md += `\n**Failure Reasoning:**\n> ${evaluation.reasoning}\n`;
      }
      md += `\n`;
    });
  }

  return md;
}

export function downloadMarkdownReport(markdown: string, filename: string = "rulebreak-report.md") {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadPdfReport(markdown: string, filename: string = "rulebreak-report.pdf") {
  const { marked } = await import('marked');
  
  // We use dynamic import for html2pdf because it requires browser globals (window/document)
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const htmlContent = await marked.parse(markdown);

  const container = document.createElement('div');
  container.innerHTML = `
    <div style="padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; line-height: 1.6; max-width: 800px; margin: 0 auto;">
      <style>
        h1 { color: #000; margin-top: 10px; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; font-size: 24px; }
        h2 { color: #111; margin-top: 24px; border-bottom: 1px solid #eaeaea; padding-bottom: 8px; font-size: 20px; }
        h3 { color: #333; margin-top: 20px; font-size: 16px; }
        h4 { color: #444; margin-top: 16px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        code { background-color: #f1f3f5; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 12px; }
        pre { background-color: #f8f9fa; padding: 12px; border-radius: 4px; overflow-x: auto; border: 1px solid #e9ecef; }
        blockquote { border-left: 4px solid #dee2e6; margin: 16px 0; padding-left: 16px; color: #495057; font-style: italic; }
        p { margin: 12px 0; font-size: 13px; }
        ul, ol { font-size: 13px; padding-left: 20px; }
      </style>
      ${htmlContent}
    </div>
  `;

  const opt = {
    margin:       0.4,
    filename:     filename,
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in' as const, format: 'letter', orientation: 'portrait' as const }
  };

  html2pdf().set(opt).from(container).save();
}
