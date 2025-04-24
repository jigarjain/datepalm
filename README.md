# DatePalm

DatePalm is a voice-based chat assistant that acts as a compassionate listener. Users can share their thoughts through voice recordings, which are then processed by OpenAI's Assistant API to provide helpful responses.

## Features

- Voice recording interface with a mobile-app style UI
- Direct integration with OpenAI's APIs:
  - Audio transcription using Whisper
  - Chat processing via the Assistants API with streaming responses
- Maintains conversation context through OpenAI threads
- Real-time response streaming as the AI responds

## Tech Stack

- **Language**: TypeScript
- **Framework**: Next.js 15^ + React v19^
- **Styling**: TailwindCSS + DaisyUI
- **API Integration**: OpenAI SDK (direct client-side integration)
- **Deployment**: Vercel + GitHub Actions

## Prerequisites

- Node.js 18.x or later
- npm
- OpenAI API key and Assistant ID

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/jigarjain/datepalm.git
cd datepalm
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following:

```
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_OPENAI_ASSISTANT_ID=your_assistant_id_here
```

4. Run the Next.js development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## OpenAI Setup

1. You need to create an Assistant in the [OpenAI platform](https://platform.openai.com/assistants)
2. Configure your Assistant to act as a compassionate listener
3. Copy your Assistant ID and add it to the `.env.local` file

## Development Status

⚠️ **Warning**: This project is currently in active development and is unstable. Features may be incomplete or change without notice.

## Security Note

This implementation uses client-side API calls with your OpenAI API key exposed in the browser. For production use, consider implementing a backend proxy to secure your API credentials.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
