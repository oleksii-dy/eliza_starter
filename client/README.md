# Nayari AI Client

A modern web interface for interacting with the Nayari AI assistant, featuring a clean, minimalist design.

## Features

- 🎨 Modern, purple-themed dark mode interface
- 💬 Real-time chat with AI
- 🔊 Text-to-speech support
- 📚 Integrated documentation
- 💻 Terminal interface
- 📱 Responsive design

## Components

### Home Page
- Clean, centered layout
- Contract address display
- Three main action buttons:
  - Documentation
  - Terminal
  - Chat with AI

### Chat Interface
- Real-time message updates
- Animated chat bubbles
- Text-to-speech support
- File attachments
- Voice input support
- Typing indicators
- Message timestamps

### Terminal
- System status display
- Command-line interface
- Real-time agent status

### Documentation
- Integrated documentation viewer
- Automatic redirection to docs

## Theme

The interface uses a custom purple theme with dark mode:
- Primary color: HSL(267, 100%, 66%)
- Background gradient
- Card overlays with backdrop blur
- Smooth animations and transitions

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Structure

```
src/
  ├── components/     # Reusable UI components
  │   └── ui/
  │       └── chat/  # Chat-specific components
  ├── routes/        # Page components
  ├── lib/          # Utilities and API client
  └── hooks/        # Custom React hooks
```

## Technologies

- React 19
- Vite
- TailwindCSS
- Radix UI
- React Query
- React Router
- React Spring
