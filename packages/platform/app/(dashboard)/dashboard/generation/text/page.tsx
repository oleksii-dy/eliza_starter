/**
 * Text Generation Page
 * Interface for text, chat, and code generation
 */

'use client';

import { useState } from 'react';
import { 
  ChatBubbleIcon, 
  CodeIcon, 
  FileTextIcon,
  PaperPlaneIcon,
  CopyIcon,
  DownloadIcon,
  ReloadIcon,
  GearIcon,
  MagicWandIcon
} from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

interface GenerationMode {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt?: string;
}

interface GenerationResult {
  id: string;
  content: string;
  model: string;
  timestamp: Date;
  cost: number;
  tokens: number;
}

const generationModes: GenerationMode[] = [
  {
    id: 'chat',
    label: 'Chat Assistant',
    description: 'Conversational AI responses',
    icon: <ChatBubbleIcon className="h-4 w-4" />,
    prompt: 'You are a helpful AI assistant. Respond to the user\'s message in a friendly and informative way.'
  },
  {
    id: 'article',
    label: 'Article Writing',
    description: 'Long-form content creation',
    icon: <FileTextIcon className="h-4 w-4" />,
    prompt: 'Write a comprehensive, well-structured article about:'
  },
  {
    id: 'code',
    label: 'Code Generation',
    description: 'Programming code and scripts',
    icon: <CodeIcon className="h-4 w-4" />,
    prompt: 'Generate clean, well-documented code for:'
  },
  {
    id: 'creative',
    label: 'Creative Writing',
    description: 'Stories, poems, and creative content',
    icon: <MagicWandIcon className="h-4 w-4" />,
    prompt: 'Write a creative and engaging piece about:'
  }
];

export default function TextGenerationPage() {
  const [selectedMode, setSelectedMode] = useState(generationModes[0]);
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(selectedMode.prompt || '');
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Generation settings
  const [settings, setSettings] = useState({
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    provider: 'openai'
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      // Mock generation - would call actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: GenerationResult = {
        id: `gen_${Date.now()}`,
        content: `Generated response for: "${prompt}"\n\nThis is a mock response that demonstrates the text generation interface. In a real implementation, this would be the actual AI-generated content based on your prompt and settings.`,
        model: settings.model,
        timestamp: new Date(),
        cost: 0.023,
        tokens: 156
      };

      setResults(prev => [mockResult, ...prev]);
      setPrompt('');
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Show toast notification
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = (result: GenerationResult) => {
    const blob = new Blob([result.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation_${result.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-stroke-weak p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-typography-strong">Text Generation</h1>
              <p className="text-typography-weak">Create text, articles, code, and conversational content</p>
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg border transition-colors",
                showSettings 
                  ? "bg-purple-500/10 border-purple-200 text-purple-600" 
                  : "border-stroke-weak hover:bg-hover"
              )}
            >
              <GearIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Generation Modes */}
          <div className="flex gap-2 mt-6">
            {generationModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode);
                  setSystemPrompt(mode.prompt || '');
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  selectedMode.id === mode.id
                    ? "bg-purple-500/10 border-purple-200 text-purple-600"
                    : "border-stroke-weak hover:bg-hover"
                )}
              >
                {mode.icon}
                <span className="text-sm font-medium">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-b border-stroke-weak p-6">
          <div className="space-y-4">
            {/* System Prompt (if settings shown) */}
            {showSettings && (
              <div>
                <label className="block text-sm font-medium text-typography-strong mb-2">
                  System Prompt
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Set the AI's role and behavior..."
                  className="w-full p-3 border border-stroke-weak rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
            )}

            {/* Main Prompt */}
            <div>
              <label className="block text-sm font-medium text-typography-strong mb-2">
                Your Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Enter your ${selectedMode.label.toLowerCase()} prompt here...`}
                className="w-full p-4 border border-stroke-weak rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-typography-weak">
                Press Cmd+Enter to generate
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors",
                  !prompt.trim() || isGenerating
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                )}
              >
                {isGenerating ? (
                  <>
                    <ReloadIcon className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PaperPlaneIcon className="h-4 w-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChatBubbleIcon className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-typography-strong mb-2">No generations yet</h3>
                <p className="text-typography-weak">Enter a prompt above to start generating content</p>
              </div>
            ) : (
              results.map((result) => (
                <div key={result.id} className="bg-card border border-stroke-weak rounded-lg p-6">
                  {/* Result Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span className="text-sm font-medium">{result.model}</span>
                      <span className="text-sm text-typography-weak">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-typography-weak">
                        {result.tokens} tokens • ${result.cost.toFixed(3)}
                      </span>
                      
                      <button
                        onClick={() => handleCopy(result.content)}
                        className="p-2 hover:bg-hover rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        <CopyIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDownload(result)}
                        className="p-2 hover:bg-hover rounded-lg transition-colors"
                        title="Download as file"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Result Content */}
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-typography-strong leading-relaxed">
                      {result.content}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="w-80 border-l border-stroke-weak bg-background p-6">
          <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
          
          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="gpt-4o">GPT-4o (Recommended)</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-typography-weak mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens</label>
              <input
                type="number"
                min="1"
                max="8000"
                value={settings.maxTokens}
                onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings(prev => ({ ...prev, provider: e.target.value }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}