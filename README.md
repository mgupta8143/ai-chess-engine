# ♟️ AI Chess Challenge

A simple chess game where you can play against an AI powered by OpenAI's language models (GPT-4 and GPT-3.5-turbo). The game features a clean, responsive interface built with Next.js, chess.js, and Tailwind CSS.

## 🚀 Features

- Play against an AI powered by OpenAI's GPT models (GPT-4 for complex positions, GPT-3.5-turbo for simpler ones)
- Clean with move history
- Simple and intuitive controls
- Game over detection with new game option

## 🛠️ Prerequisites

- Node.js 20+ (managed by `.nvmrc`)
- npm or yarn
- OpenAI API key ([get one here](https://platform.openai.com/account/api-keys))

## 🏃‍♂️ Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/ai-chess-challenge.git
   cd ai-chess-challenge
   npm install
   ```

2. **Set up environment**
   ```bash
   echo "OPENAI_API_KEY=your_api_key_here" > .env.local
   ```
   Replace `your_api_key_here` with your actual OpenAI API key.

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000) in your browser** to start playing!

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 🧩 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Chess Logic**: chess.js
- **UI Components**: react-chessboard
- **AI**: OpenAI API (GPT-3.5 Turbo / GPT-4)