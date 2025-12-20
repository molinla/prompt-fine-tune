# Prompt Fine-Tune

A powerful Prompt Playground and Batch Testing tool built with Next.js, Radix UI, and AI SDK. This repository provides a professional environment for iterating on AI prompts, comparing model responses, and verifying outputs at scale.

## Features

- **Prompt Playground**: Interactive split-layout interface for testing prompts in real-time.
- **Multi-Model Support**: Integrated with OpenRouter and OpenAI, allowing easy switching between different AI models.
- **Batch Testing**:
  - **Overview**: Run all test cases simultaneously and observe overall success rates and trend history.
  - **Detail View**: Run individual test cases with configurable verification scripts and multi-loop repetitions (e.g., 10x success validation).
- **Auto-Save & History**: Persistent storage for batch test configurations and execution history.
- **Modern UI**: Built with Tailwind CSS, Lucide icons, and Radix UI components for a premium, responsive experience.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm / npm / yarn / bun

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up your environment variables in `.env.local`:
   ```env
   OPENROUTER_API_KEY=your_key_here
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org)
- **AI Integration**: [AI SDK](https://sdk.vercel.ai/docs)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
