/**
 * Image Generation Page
 * Interface for AI image generation and editing
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  ImageIcon, 
  PaperPlaneIcon,
  DownloadIcon,
  ReloadIcon,
  GearIcon,
  PlusIcon,
  Cross2Icon,
  MagicWandIcon,
  SizeIcon
} from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

interface ImageStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  preview?: string;
}

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  model: string;
  timestamp: Date;
  cost: number;
  settings: any;
}

const imageStyles: ImageStyle[] = [
  {
    id: 'realistic',
    name: 'Realistic',
    description: 'Photorealistic images',
    prompt: 'photorealistic, high quality, detailed'
  },
  {
    id: 'artistic',
    name: 'Artistic',
    description: 'Artistic and painterly style',
    prompt: 'artistic, painting, beautiful composition'
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Anime and manga style',
    prompt: 'anime style, manga, detailed illustration'
  },
  {
    id: 'digital',
    name: 'Digital Art',
    description: 'Modern digital artwork',
    prompt: 'digital art, concept art, trending on artstation'
  },
  {
    id: '3d',
    name: '3D Render',
    description: '3D rendered style',
    prompt: '3d render, blender, octane render, high quality'
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Retro and vintage aesthetic',
    prompt: 'vintage style, retro, film photography'
  }
];

const aspectRatios = [
  { id: '1:1', label: 'Square', width: 1024, height: 1024 },
  { id: '16:9', label: 'Landscape', width: 1536, height: 864 },
  { id: '9:16', label: 'Portrait', width: 864, height: 1536 },
  { id: '4:3', label: 'Standard', width: 1152, height: 864 },
  { id: '3:4', label: 'Portrait 3:4', width: 864, height: 1152 }
];

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation settings
  const [settings, setSettings] = useState({
    model: 'dall-e-3',
    provider: 'openai',
    aspectRatio: '1:1',
    quality: 'standard',
    numImages: 1,
    guidanceScale: 7.5,
    steps: 50,
    seed: ''
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    try {
      // Mock generation - would call actual API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const numResults = settings.numImages;
      const newResults: GenerationResult[] = [];
      
      for (let i = 0; i < numResults; i++) {
        const mockResult: GenerationResult = {
          id: `img_${Date.now()}_${i}`,
          url: `https://picsum.photos/seed/${Date.now() + i}/1024/1024`,
          prompt: prompt + (selectedStyle ? ` ${selectedStyle.prompt}` : ''),
          model: settings.model,
          timestamp: new Date(),
          cost: 0.04,
          settings: { ...settings }
        };
        newResults.push(mockResult);
      }

      setResults(prev => [...newResults, ...prev]);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle reference image upload
      console.log('Reference image:', file);
    }
  };

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const selectedAspectRatio = aspectRatios.find(ar => ar.id === settings.aspectRatio);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-stroke-weak p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-typography-strong">Image Generation</h1>
              <p className="text-typography-weak">Create stunning images with AI-powered tools</p>
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
        </div>

        {/* Input Area */}
        <div className="border-b border-stroke-weak p-6">
          <div className="space-y-6">
            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-typography-strong mb-3">
                Style (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {imageStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(selectedStyle?.id === style.id ? null : style)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors",
                      selectedStyle?.id === style.id
                        ? "bg-purple-500/10 border-purple-200 text-purple-600"
                        : "border-stroke-weak hover:bg-hover"
                    )}
                  >
                    <div className="font-medium text-sm">{style.name}</div>
                    <div className="text-xs text-typography-weak mt-1">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-typography-strong mb-2">
                Describe your image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A beautiful sunset over a mountain landscape..."
                className="w-full p-4 border border-stroke-weak rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            {/* Negative Prompt */}
            {showSettings && (
              <div>
                <label className="block text-sm font-medium text-typography-strong mb-2">
                  Negative Prompt (What to avoid)
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="blurry, low quality, distorted..."
                  className="w-full p-3 border border-stroke-weak rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            )}

            {/* Quick Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-typography-weak mb-1">Aspect Ratio</label>
                  <select
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
                    className="p-2 border border-stroke-weak rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {aspectRatios.map(ratio => (
                      <option key={ratio.id} value={ratio.id}>{ratio.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-typography-weak mb-1">Images</label>
                  <select
                    value={settings.numImages}
                    onChange={(e) => setSettings(prev => ({ ...prev, numImages: parseInt(e.target.value) }))}
                    className="p-2 border border-stroke-weak rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>1 image</option>
                    <option value={2}>2 images</option>
                    <option value={4}>4 images</option>
                  </select>
                </div>

                <button
                  onClick={handleImageUpload}
                  className="flex items-center gap-2 px-3 py-2 border border-stroke-weak rounded-lg hover:bg-hover transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span className="text-sm">Reference</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                    <MagicWandIcon className="h-4 w-4" />
                    Generate Images
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
                  <ImageIcon className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-typography-strong mb-2">No images generated yet</h3>
                <p className="text-typography-weak">Enter a prompt above to start creating images</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result) => (
                  <div key={result.id} className="bg-card border border-stroke-weak rounded-lg overflow-hidden">
                    {/* Image */}
                    <div className="relative group">
                      <Image
                        src={result.url}
                        alt={result.prompt}
                        width={1024}
                        height={1024}
                        className="w-full aspect-square object-cover"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleDownload(result.url, `image_${result.id}.png`)}
                          className="p-2 bg-white/20 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors"
                        >
                          <DownloadIcon className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-sm text-typography-strong line-clamp-2 mb-2">
                        {result.prompt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-typography-weak">
                        <span>{result.model}</span>
                        <span>${result.cost.toFixed(3)}</span>
                      </div>
                      <div className="text-xs text-typography-weak mt-1">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="w-80 border-l border-stroke-weak bg-background p-6">
          <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
          
          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="dall-e-3">DALL-E 3</option>
                <option value="dall-e-2">DALL-E 2</option>
                <option value="stable-diffusion">Stable Diffusion</option>
                <option value="midjourney">Midjourney</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-sm font-medium mb-2">Quality</label>
              <select
                value={settings.quality}
                onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="standard">Standard</option>
                <option value="hd">HD (Higher cost)</option>
              </select>
            </div>

            {/* Guidance Scale */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Guidance Scale: {settings.guidanceScale}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={settings.guidanceScale}
                onChange={(e) => setSettings(prev => ({ ...prev, guidanceScale: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-typography-weak mt-1">
                <span>Creative</span>
                <span>Accurate</span>
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium mb-2">Steps</label>
              <input
                type="number"
                min="10"
                max="150"
                value={settings.steps}
                onChange={(e) => setSettings(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Seed */}
            <div>
              <label className="block text-sm font-medium mb-2">Seed (Optional)</label>
              <input
                type="text"
                value={settings.seed}
                onChange={(e) => setSettings(prev => ({ ...prev, seed: e.target.value }))}
                placeholder="Random"
                className="w-full p-2 border border-stroke-weak rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-typography-weak mt-1">
                Use same seed for consistent results
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}