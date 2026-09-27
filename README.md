# RULEBREAK

"Give us your rules. We'll try to break them."

RULEBREAK is an AI-powered policy stress-testing system designed to attack natural language rules (like return policies, terms of service, or compliance guidelines) and find edge cases, contradictions, and missing information before they affect real people.

## Features
- **Rule Extraction**: Distills natural language into testable logical conditions.
- **Scenario Generation**: Invents adversarial edge cases across boundaries.
- **Policy Adjudication**: Automatically judges the edge cases against the policy.
- **Finding Aggregation**: Groups failures into actionable gaps and contradictions.
- **Challenge Mode**: Red-teams specific rules with targeted adversarial scenarios.
- **Patch & Regression**: Suggests a fix and immediately re-runs all prior test scenarios to guarantee the patch works without introducing regressions.

## Architecture & Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & shadcn/ui
- **Validation**: Zod (Strict JSON validation for LLM outputs)
- **AI Models**: NVIDIA API (Llama 3.1 70B for fast generation, 405B for reasoning). Mock provider included for deterministic demo flows.

## Quick Start (Demo Mode)

The system ships with a deterministic `MockProvider` that requires no API keys and perfectly demonstrates the intended user journey.

1. Clone the repository.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and ensure `AI_PROVIDER=mock` and `DEMO_MODE=true`
4. Run the development server: `npm run dev`
5. Visit `http://localhost:3000`
6. Click **"Try the demo policy"** to see the full pipeline in action.

## Running with Live AI

1. Edit `.env.local`:
   ```bash
   AI_PROVIDER=nvidia
   DEMO_MODE=false
   NVIDIA_API_KEY=your_key
   ```
2. Run the application and paste a custom return policy on the workspace page.

## Limitations
- This is a hackathon prototype focused on e-commerce return policies.
- File uploads are simulated via text pasting in the current iteration.
- Live AI execution depends on model latency and strict JSON adherence.
