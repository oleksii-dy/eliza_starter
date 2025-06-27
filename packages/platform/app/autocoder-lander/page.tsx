'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-switcher';
import { useUnifiedAuth } from '@/src/hooks/useUnifiedAuth';
import { ChatMessage } from '@/components/autocoder/AgentChat';
import { useAutocoderWebSocket } from '@/lib/hooks/useAutocoderWebSocket';

// Example prompts for users
const examplePrompts = [
  'I think interest rates are going to go up. How do I make money on that?',
  'Build me a trading bot that monitors crypto prices',
  'Create a DeFi yield farming strategy',
  'Help me build a DAO governance system',
  'Design a token vesting contract',
  'Build an NFT marketplace with royalties'
];

// Mock conversation for demo
const mockConversation: Array<{ type: 'user' | 'agent', message: string }> = [
  {
    type: 'user',
    message: 'I think interest rates are going to go up. I just read that Trump is gonna replace Powell to hike rates. How do I make money on that?'
  },
  {
    type: 'agent',
    message: "Well, you could buy the 'yes' position on Polymarket for rate hikes. They have prediction markets for Federal Reserve decisions."
  },
  {
    type: 'user',
    message: "That's cool, what else could I do that's more creative?"
  },
  {
    type: 'agent',
    message: "Here's a more sophisticated strategy: You could buy 'yes' on rate hikes on Polymarket, then go long yield by looping on Aave (borrowing against your collateral to earn higher yields), and to hedge I would short Bitcoin since crypto typically drops when rates rise."
  },
  {
    type: 'user',
    message: "Damn that's pretty smart, how do I do that?"
  },
  {
    type: 'agent',
    message: 'I can create a workflow for you! We can build it together, test it, and then execute it. Would you like me to start coding this strategy?'
  },
  {
    type: 'user',
    message: 'Sure. And then take my winnings and convert them to USDC and send to my Solana wallet'
  },
  {
    type: 'agent',
    message: "Perfect! Let me cook for a few minutes and get back to you. I'll create a complete workflow called 'Powell Hedging Strategy' that:\n\n1. Buys 'yes' on rate hikes on Polymarket\n2. Sets up yield looping on Aave\n3. Shorts BTC as a hedge\n4. Auto-converts profits to USDC\n5. Bridges to Solana\n\nStarting implementation now... 🧑‍🍳"
  }
];

export default function AutocoderLander() {
  const router = useRouter();
  const auth = useUnifiedAuth();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Always call the hook but conditionally use it
  const wsConnection = useAutocoderWebSocket(auth.user?.id || '');
  const shouldConnect = auth.isAuthenticated && showChat;
  const isConnected = shouldConnect && wsConnection?.isConnected || false;
  const sendMessage = shouldConnect ? wsConnection?.sendMessage : (() => {});

  // Listen for WebSocket messages
  useEffect(() => {
    if (wsConnection && currentProjectId) {
      const wsMessages = wsConnection.messages.filter(
        msg => msg.projectId === currentProjectId
      );

      // Add new WebSocket messages to our local state
      setMessages(prev => {
        const newMessages = wsMessages.filter(
          wsMsg => !prev.some(msg => msg.id === wsMsg.id)
        );

        if (newMessages.length > 0) {
          setIsTyping(false);
          return [...prev, ...newMessages];
        }
        return prev;
      });
    }
  }, [wsConnection?.messages, currentProjectId]);

  // Demo animation effect
  useEffect(() => {
    if (!showChat && currentDemoIndex < mockConversation.length) {
      const timer = setTimeout(() => {
        setCurrentDemoIndex(prev => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentDemoIndex, showChat]);

  const handleStartChat = async () => {
    if (!prompt.trim()) {return;}

    if (!auth.isAuthenticated) {
      // Save prompt and redirect to login
      sessionStorage.setItem('autocoderPrompt', prompt);
      router.push('/auth/login?returnTo=/autocoder-lander');
      return;
    }

    setIsLoading(true);

    try {
      // Create a new Eliza session via API
      const response = await fetch('/api/autocoder/eliza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { projectId } = await response.json();

      // Set the current project ID
      setCurrentProjectId(projectId);

      // Start chat interface
      setShowChat(true);

      // Create initial message
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        projectId,
        type: 'user',
        message: prompt,
        timestamp: new Date()
      };

      setMessages([initialMessage]);
      setIsLoading(false);

      // Subscribe to project updates
      if (wsConnection) {
        wsConnection.subscribe(projectId);

        // Send to agent via websocket
        sendMessage({
          type: 'AGENT_MESSAGE',
          projectId,
          message: prompt,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      setIsLoading(false);
      // Could show an error toast here
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentProjectId || !message.trim()) {return;}

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      projectId: currentProjectId,
      type: 'user',
      message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);
    setPrompt(''); // Clear input

    try {
      // Send message via API instead of websocket for better reliability
      const response = await fetch('/api/autocoder/eliza/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Message sent successfully, agent response will come via websocket
      // or we can poll for new messages
      setTimeout(() => {
        checkForNewMessages();
      }, 2000);

    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      // Could show an error message here
    }
  };

  // Check for new messages from the agent
  const checkForNewMessages = async () => {
    if (!currentProjectId) {return;}

    try {
      const response = await fetch(`/api/autocoder/eliza?projectId=${currentProjectId}`);
      if (response.ok) {
        const { messages: latestMessages } = await response.json();

        // Filter out messages we already have
        const newMessages = latestMessages.filter((msg: any) =>
          !messages.some(existingMsg => existingMsg.id === msg.id)
        );

        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages.map((msg: any) => ({
            id: msg.id,
            projectId: currentProjectId,
            type: msg.type,
            message: msg.message,
            timestamp: new Date(msg.timestamp)
          }))]);
          setIsTyping(false);
        }
      }
    } catch (error) {
      console.error('Failed to check for new messages:', error);
      setIsTyping(false);
    }
  };

  // Check for saved prompt after login
  useEffect(() => {
    if (auth.isAuthenticated) {
      const savedPrompt = sessionStorage.getItem('autocoderPrompt');
      if (savedPrompt) {
        setPrompt(savedPrompt);
        sessionStorage.removeItem('autocoderPrompt');
        // Auto-start chat with saved prompt
        setTimeout(() => handleStartChat(), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  if (showChat) {
    // Full chat interface
    return (
      <div className="flex h-screen flex-col bg-background">
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b border-stroke-weak bg-white px-6 py-4 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowChat(false)}
              className="text-typography-weak hover:text-typography-strong"
            >
              ← Back
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-typography-strong">Eliza</h2>
                <p className="text-xs text-typography-weak">
                  {isConnected ? 'Online' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-orange-600 text-white'
                    : 'border border-stroke-weak bg-white text-typography-strong dark:bg-gray-800'
                }`}>
                  {msg.type === 'agent' && (
                    <div className="mb-2 flex items-center text-xs text-typography-weak">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Eliza
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-stroke-weak bg-white px-4 py-3 dark:bg-gray-800">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-3 w-3 text-orange-600" />
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-stroke-weak bg-white px-4 py-4 dark:bg-gray-900">
          <div className="mx-auto flex max-w-3xl items-end space-x-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(prompt)}
              placeholder="Ask Eliza anything about DeFi, trading, or building..."
              className="flex-1 rounded-lg border border-stroke-weak bg-background px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => handleSendMessage(prompt)}
              disabled={!prompt.trim() || !isConnected}
              className="rounded-lg bg-orange-600 px-6 py-3 text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-stroke-weak px-6 py-6 lg:px-12">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded bg-orange-600" />
          <span className="text-xl font-semibold text-typography-strong">
            ElizaOS
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {!auth.isAuthenticated && (
            <>
              <button
                onClick={() => router.push('/auth/login')}
                className="text-typography-weak hover:text-typography-strong"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left side - Hero and Input */}
          <div className="flex flex-col justify-center">
            <h1 className="mb-4 text-5xl font-bold text-typography-strong lg:text-6xl">
              <span className="text-orange-600">AI-Powered</span>
              <br />
              Autocoding
              <br />
              for DeFi
            </h1>

            <p className="mb-8 text-lg text-typography-weak">
              Let Eliza generate code, deploy smart contracts, and automate your
              decentralized finance projects. Get started in seconds.
            </p>

            {/* Main Input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartChat()}
                  placeholder="What do you want to build?"
                  className="w-full rounded-lg border-2 border-stroke-weak bg-white px-6 py-4 text-lg placeholder-typography-weak focus:border-orange-500 focus:outline-none dark:bg-gray-800"
                />
                <button
                  onClick={handleStartChat}
                  disabled={isLoading || !prompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-orange-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      LET'S COOK
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="space-y-2">
              <p className="text-sm text-typography-weak">Try these:</p>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.slice(0, 3).map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-stroke-weak bg-white px-3 py-1 text-sm text-typography-weak hover:border-orange-500 hover:text-orange-600 dark:bg-gray-800"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Example Conversation */}
          <div className="relative">
            <div className="rounded-lg border border-stroke-weak bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-typography-weak">Live Demo</span>
              </div>

              <div className="space-y-4">
                {mockConversation.slice(0, currentDemoIndex).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.type === 'user'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {msg.type === 'agent' && (
                        <div className="mb-1 flex items-center text-xs opacity-70">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Eliza
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}

                {currentDemoIndex < mockConversation.length && (
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-orange-600" />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-orange-600" style={{ animationDelay: '200ms' }} />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-orange-600" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Anime-style Eliza illustration */}
            <div className="absolute -bottom-4 -right-4 h-32 w-32 opacity-10">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-orange-400 to-orange-600" />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <Sparkles className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="mb-2 font-semibold text-typography-strong">Smart Workflows</h3>
            <p className="text-sm text-typography-weak">
              Eliza creates complete DeFi strategies and executes them automatically
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <Send className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="mb-2 font-semibold text-typography-strong">Natural Language</h3>
            <p className="text-sm text-typography-weak">
              Just describe what you want in plain English - no coding required
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <ArrowRight className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="mb-2 font-semibold text-typography-strong">Instant Deployment</h3>
            <p className="text-sm text-typography-weak">
              From idea to live smart contract in minutes, not days
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
