/**
 * Create Character Page - Form to create new character
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MessageExample {
  user: string;
  assistant: string;
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    avatarUrl: '',
    characterConfig: {
      name: '',
      bio: '',
      personality: '',
      style: '',
      system: '',
      knowledge: [] as string[],
      messageExamples: [] as MessageExample[][],
    },
    visibility: 'private' as 'private' | 'organization' | 'public',
  });
  
  const [newKnowledgeItem, setNewKnowledgeItem] = useState('');
  const [currentExample, setCurrentExample] = useState<MessageExample>({ user: '', assistant: '' });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
      characterConfig: {
        ...prev.characterConfig,
        name,
      },
    }));
  };

  const addKnowledgeItem = () => {
    if (newKnowledgeItem.trim()) {
      setFormData(prev => ({
        ...prev,
        characterConfig: {
          ...prev.characterConfig,
          knowledge: [...prev.characterConfig.knowledge, newKnowledgeItem.trim()],
        },
      }));
      setNewKnowledgeItem('');
    }
  };

  const removeKnowledgeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      characterConfig: {
        ...prev.characterConfig,
        knowledge: prev.characterConfig.knowledge.filter((_, i) => i !== index),
      },
    }));
  };

  const addMessageExample = () => {
    if (currentExample.user.trim() && currentExample.assistant.trim()) {
      setFormData(prev => ({
        ...prev,
        characterConfig: {
          ...prev.characterConfig,
          messageExamples: [...prev.characterConfig.messageExamples, [currentExample]],
        },
      }));
      setCurrentExample({ user: '', assistant: '' });
    }
  };

  const removeMessageExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      characterConfig: {
        ...prev.characterConfig,
        messageExamples: prev.characterConfig.messageExamples.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/characters');
      } else {
        console.error('Error creating character:', data.error);
        alert(data.error || 'Failed to create character');
      }
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Failed to create character');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/characters">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Character</h1>
          <p className="text-gray-600 mt-2">
            Create a new AI character for your organization
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Character Name *</Label>
                <Input
                  type="text"
                  htmlFor="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter character name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  type="text"
                  htmlFor="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="character-name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the character"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                htmlFor="avatarUrl"
                type="url"
                value={formData.avatarUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                value={formData.visibility}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  visibility: e.target.value as 'private' | 'organization' | 'public' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="private">Private (Only you)</option>
                <option value="organization">Organization (All members)</option>
                <option value="public">Public (Everyone)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Character Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Character Personality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                value={formData.characterConfig.bio}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characterConfig: { ...prev.characterConfig, bio: e.target.value }
                }))}
                placeholder="Describe the character's background and personality"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="personality">Personality Traits</Label>
              <Textarea
                id="personality"
                value={formData.characterConfig.personality}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characterConfig: { ...prev.characterConfig, personality: e.target.value }
                }))}
                placeholder="Describe the character's personality traits"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="style">Communication Style</Label>
              <Textarea
                id="style"
                value={formData.characterConfig.style}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characterConfig: { ...prev.characterConfig, style: e.target.value }
                }))}
                placeholder="How does the character communicate? (formal, casual, humorous, etc.)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="system">Additional Instructions</Label>
              <Textarea
                id="system"
                value={formData.characterConfig.system}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characterConfig: { ...prev.characterConfig, system: e.target.value }
                }))}
                placeholder="Additional system instructions for the character"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Knowledge */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge & Expertise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newKnowledgeItem}
                onChange={(e) => setNewKnowledgeItem(e.target.value)}
                placeholder="Add knowledge topic or expertise"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKnowledgeItem())}
              />
              <Button type="button" onClick={addKnowledgeItem}>
                Add
              </Button>
            </div>

            {formData.characterConfig.knowledge.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.characterConfig.knowledge.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeKnowledgeItem(index)}
                  >
                    {item} ×
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Message Examples</CardTitle>
            <p className="text-sm text-gray-600">
              Provide examples of how the character should respond to help train its behavior
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="example-user">User Message</Label>
                <Textarea
                  id="example-user"
                  value={currentExample.user}
                  onChange={(e) => setCurrentExample(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="What a user might say..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="example-assistant">Character Response</Label>
                <Textarea
                  id="example-assistant"
                  value={currentExample.assistant}
                  onChange={(e) => setCurrentExample(prev => ({ ...prev, assistant: e.target.value }))}
                  placeholder="How the character should respond..."
                  rows={3}
                />
              </div>
            </div>

            <Button type="button" onClick={addMessageExample}>
              Add Example
            </Button>

            {formData.characterConfig.messageExamples.length > 0 && (
              <div className="space-y-3">
                {formData.characterConfig.messageExamples.map((example, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Example {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessageExample(index)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-600 mb-1">User:</div>
                        <div className="bg-gray-50 p-2 rounded">
                          {example[0].user}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-600 mb-1">Character:</div>
                        <div className="bg-blue-50 p-2 rounded">
                          {example[0].assistant}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/characters">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create Character'}
          </Button>
        </div>
      </form>
    </div>
  );
}