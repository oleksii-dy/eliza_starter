@elizaos/plugin-udio

A Udio AI music generation plugin for ElizaOS that enables AI-powered music creation and audio manipulation.

OVERVIEW

The Udio plugin integrates Udio AI's powerful music generation capabilities into ElizaOS, providing a seamless way to:
- Generate music from text prompts
- Extend existing audio tracks with AI-powered continuation
- Create custom music with fine-tuned parameters

Original Plugin adapted for ElizaOS: https://github.com/flowese/UdioWrapper/

INSTALLATION

    npm install @elizaos/plugin-udio

QUICK START

1. Register the plugin with ElizaOS:

    import { udioPlugin } from '@elizaos/plugin-udio';

    const eliza = new Eliza();
    eliza.registerPlugin(udioPlugin);

2. Configure the Udio provider with your API credentials:

    import { udioProvider } from '@elizaos/plugin-udio';

    udioProvider.authToken = 'your-udio-auth-token';

FEATURES

1. Generate Music
   Generate music using text prompts and optional parameters:

    await eliza.execute('udio.generate', {
      prompt: "An upbeat electronic dance track with energetic beats",
      seed: 12345,  // optional
      customLyrics: "Your custom lyrics here"  // optional
    });

2. Extend Audio
   Extend existing audio tracks with AI-powered continuation:

    await eliza.execute('udio.extend', {
      prompt: "Continue with similar style",
      audioConditioningPath: "path/to/audio.mp3",
      audioConditioningSongId: "original-song-id",
      cropStartTime: 30,  // optional: start time in seconds
      seed: 12345  // optional
    });

API REFERENCE

UdioProvider Configuration
The Udio provider requires authentication:

    interface UdioProvider {
      authToken: string;
    }

Action Parameters:

1. Generate Music
    interface UdioGenerateOptions {
      prompt: string;
      seed?: number;
      customLyrics?: string;
    }

2. Extend Audio
    interface UdioExtendOptions {
      prompt: string;
      audioConditioningPath: string;
      audioConditioningSongId: string;
      cropStartTime?: number;
      seed?: number;
      customLyrics?: string;
    }

Response Types:

    interface UdioSong {
      id: string;
      title: string;
      song_path: string;
      finished: boolean;
    }

    interface UdioResponse {
      songs: UdioSong[];
    }

ERROR HANDLING

The plugin includes built-in error handling for common scenarios:

    try {
      await eliza.execute('udio.generate', params);
    } catch (error) {
      if (error.message.includes('HTTP error!')) {
        // Handle API-specific errors
      }
      // Handle other errors
    }

EXAMPLES

Generating a New Song:

    const result = await eliza.execute('udio.generate', {
      prompt: "Create a pop song with vocals, drums, and guitar",
      seed: 12345,
      customLyrics: "Verse 1: Your custom lyrics here..."
    });

    console.log(`Generated songs:`, result.songs);

Extending an Existing Track:

    const extended = await eliza.execute('udio.extend', {
      prompt: "Continue the melody with similar style",
      audioConditioningPath: "/path/to/original.mp3",
      audioConditioningSongId: "original-123",
      cropStartTime: 60  // Start continuation from 1 minute mark
    });

    console.log(`Extended songs:`, extended.songs);

LICENSE

MIT

SUPPORT

For issues and feature requests, please open an issue on our GitHub repository.

---
Built with ❤️ for ElizaOS
