@elizaos/plugin-udio

A Udio AI music generation plugin for ElizaOS that enables AI-powered music creation and audio manipulation.

OVERVIEW

The Udio plugin integrates Udio AI's powerful music generation capabilities into ElizaOS, providing a seamless way to:
- Generate music from text prompts with fine-tuned parameters
- Create custom music with advanced control over style and lyrics
- Extend existing audio tracks with AI-powered continuation

Original Plugin adapted for ElizaOS: https://github.com/flowese/UdioWrapper/

INSTALLATION

    npm install @elizaos/plugin-udio

QUICK START

1. Register the plugin with ElizaOS:

    import { udioPlugin } from '@elizaos/plugin-udio';
    import { Eliza } from '@elizaos/core';

    const eliza = new Eliza();
    eliza.registerPlugin(udioPlugin);

2. Configure the Udio provider with your API credentials:

    import { udioProvider } from '@elizaos/plugin-udio';

    udioProvider.configure({
      authToken: 'your-udio-auth-token'
    });

FEATURES

1. Generate Music (udio.generate)
   Generate music using a text prompt with basic control parameters. This is ideal for quick music generation:

   - Simple text-to-music generation
   - Optional seed for reproducible results
   - Support for custom lyrics

    await eliza.execute('udio.generate', {
      prompt: "An upbeat electronic dance track with energetic beats",
      seed: 12345,
      customLyrics: "Your custom lyrics here"
    });

2. Extend Audio (udio.extend)
   Extend existing audio tracks to create longer compositions. Useful for:

   - Lengthening existing music pieces
   - Creating variations of existing tracks
   - Seamless continuation of melodies

    await eliza.execute('udio.extend', {
      prompt: "Continue with similar style",
      audioConditioningPath: "path/to/audio.mp3",
      audioConditioningSongId: "original-song-id",
      cropStartTime: 30,
      seed: 12345
    });

Generation Parameters Explained:

- seed: Controls the randomness of generation
  * Same seed will produce similar results
  * Different seeds create variations

- cropStartTime: Controls where the extension begins (for extend action)
  * Specified in seconds
  * Useful for precise control over continuation point

API REFERENCE

UdioProvider Configuration
The Udio provider accepts the following configuration options:

    interface UdioConfig {
      authToken: string;
    }

Action Parameters:

1. Generate Music (udio.generate)
    interface GenerateParams {
      prompt: string;
      seed?: number;           // Optional seed for reproducibility
      customLyrics?: string;   // Optional custom lyrics
    }

2. Extend Audio (udio.extend)
    interface ExtendParams {
      prompt: string;
      audioConditioningPath: string;    // Path to original audio
      audioConditioningSongId: string;  // ID of original song
      cropStartTime?: number;           // Start time in seconds
      seed?: number;                    // Optional seed
      customLyrics?: string;            // Optional lyrics for extension
    }

Response Types:
    interface UdioSong {
      id: string;             // Generated song ID
      title: string;          // Song title
      song_path: string;      // Path to download the song
      finished: boolean;      // Generation status
    }

    interface UdioResponse {
      songs: UdioSong[];     // Array of generated songs
    }

ERROR HANDLING

The plugin includes built-in error handling for common scenarios:

    try {
      await eliza.execute('udio.generate', params);
    } catch (error) {
      if (error.code === 'UDIO_API_ERROR') {
        // Handle API-specific errors
      }
      // Handle other errors
    }

EXAMPLES

Creating a Pop Song:

    const result = await eliza.execute('udio.generate', {
      prompt: "Create a pop song with vocals, drums, and guitar",
      seed: 12345,
      customLyrics: "Verse 1: Your custom lyrics here..."
    });

Extending an Existing Track:

    const extended = await eliza.execute('udio.extend', {
      prompt: "Continue the melody with similar style",
      audioConditioningPath: "/path/to/original.mp3",
      audioConditioningSongId: "original-123",
      cropStartTime: 60  // Start continuation from 1 minute mark
    });

LICENSE

MIT

SUPPORT

For issues and feature requests, please open an issue on our GitHub repository.

---
Built with ❤️ for ElizaOS
