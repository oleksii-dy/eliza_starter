'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Zap, GitBranch, CheckCircle, Github } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-switcher';

export default function WebsiteLander() {
  const router = useRouter();
  const [buildPrompt, setBuildPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = [
    'A community manager for my Telegram group',
    'Trading bot that monitors crypto prices',
    'Research assistant to analyze academic papers',
    'Content creator for social media posts'
  ];

  const handleStartBuilding = () => {
    if (buildPrompt || selectedTemplate) {
      // Navigate to dashboard with the build prompt
      router.push(`/dashboard?prompt=${encodeURIComponent(buildPrompt || selectedTemplate)}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleTemplateClick = (template: string) => {
    setSelectedTemplate(template);
    setBuildPrompt(template);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-6 border-b border-stroke-weak">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-accent rounded" />
          <span className="text-xl font-semibold text-typography-strong">ElizaOS Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/elizaos/eliza" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-typography-weak hover:text-typography-strong transition-colors"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <ThemeToggle />
          <Button 
            variant="secondary"
            handleClick={() => router.push('/auth/login')}
            className="!bg-white !text-typography-strong hover:!bg-gray-50 dark:!bg-gray-800 dark:!text-white dark:hover:!bg-gray-700"
          >
            Sign in
          </Button>
          <Button 
            handleClick={() => router.push('/auth/signup')}
            variant="accent"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-6 lg:px-12 py-20 max-w-4xl mx-auto">
        <h1 className="text-5xl lg:text-6xl font-bold text-center mb-6">
          Ship AI Agents
          <br />
          In <span className="text-brand">Minutes</span>
        </h1>

        <p className="text-lg text-typography-weak text-center mb-12 max-w-2xl">
          Complete agent development platform: inference, hosting, file storage, and 
          rapid deployment. From prototype to production without the infrastructure headache.
        </p>

        {/* Build Input with CTA */}
        <div className="w-full max-w-3xl mb-8">
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Describe what you want to build..."
              value={buildPrompt}
              handleChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setBuildPrompt(e.target.value)}
              className="flex-1"
            />
            <Button 
              handleClick={handleStartBuilding}
              variant="accent"
              className="px-8 flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Start Building
            </Button>
          </div>
        </div>

        {/* Template Buttons */}
        <div className="flex flex-wrap gap-3 mb-16 justify-center max-w-3xl">
          {templates.map((template) => (
            <Button
              key={template}
              variant="outline"
              handleClick={() => handleTemplateClick(template)}
              className={`text-sm ${
                selectedTemplate === template ? 'border-accent bg-accent-fill' : ''
              }`}
            >
              {template}
            </Button>
          ))}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-8 text-sm text-typography-weak">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Free tier available</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-success" />
            <span>Git-based deployments</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Full API access</span>
          </div>
        </div>
      </main>
    </div>
  );
}