/**
 * Characters Dashboard Page - Browse and manage characters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, MessageSquare, Users, Bot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  description?: string;
  slug: string;
  avatarUrl?: string;
  characterConfig: {
    name: string;
    bio: string;
    personality?: string;
  };
  visibility: string;
  isActive: boolean;
  totalConversations: number;
  totalMessages: number;
  createdBy: string;
  createdAt: string;
}

interface CharacterStats {
  totalCharacters: number;
  activeCharacters: number;
  totalConversations: number;
  totalMessages: number;
}

export default function CharactersPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  const fetchCharacters = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (visibilityFilter !== 'all') params.append('visibility', visibilityFilter);

      const response = await fetch(`/api/characters?${params}`);
      const data = await response.json();

      if (data.success) {
        setCharacters(data.data.characters);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, visibilityFilter]);

  useEffect(() => {
    fetchCharacters();
  }, [searchQuery, visibilityFilter, fetchCharacters]);

  const startConversation = async (characterId: string) => {
    try {
      const response = await fetch(`/api/characters/${characterId}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/characters/chat/${data.data.id}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Characters</h1>
          <p className="text-gray-600 mt-2">
            Chat with AI characters powered by your organization's credits
          </p>
        </div>
        <Link href="/characters/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Character
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Characters</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCharacters}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Characters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCharacters}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="organization">Organization</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* Characters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character) => (
          <Card key={character.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={character.avatarUrl} alt={character.name} />
                  <AvatarFallback>
                    {character.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{character.name}</CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {character.characterConfig.bio}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {character.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {character.description}
                  </p>
                )}
                
                {character.characterConfig.personality && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Personality:</span>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {character.characterConfig.personality}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant={character.visibility === 'public' ? 'default' : 'secondary'}>
                      {character.visibility}
                    </Badge>
                    {character.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {character.totalConversations} conversations
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => startConversation(character.id)}
                    className="flex-1"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                  <Link href={`/characters/${character.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-12">
          <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No characters found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first character to get started.'}
          </p>
          <Link href="/characters/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Character
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}