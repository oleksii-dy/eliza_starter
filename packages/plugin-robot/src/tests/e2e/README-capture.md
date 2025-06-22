# Vision Capture Log Test

This test captures 30 seconds of continuous vision data from your camera and saves it to the `logs/` directory for analysis.

## What it does

- Captures images every 500ms for 30 seconds (60 captures total)
- Runs VLM (Vision Language Model) analysis on each frame
- Detects motion-based objects and people
- Tracks scene changes and statistics
- Saves all data to timestamped log directory

## Running the test

```bash
# Using npm/bun script
npm run test:capture
# or
bun run test:capture

# Direct execution
bun run src/tests/e2e/run-capture-log.ts
```

## Output

The test creates a timestamped directory in `logs/` with:

- `vision-capture-summary.json` - Complete capture data and statistics
- `vision-capture-report.md` - Human-readable report
- `capture-XXX.jpg` - Individual captured images
- `scene-XXX.json` - Detailed scene analysis for each capture

## Example Output Structure

```
logs/
└── vision-capture-2024-01-15T10-30-45-123Z/
    ├── vision-capture-summary.json
    ├── vision-capture-report.md
    ├── capture-000.jpg
    ├── capture-001.jpg
    ├── ...
    ├── capture-059.jpg
    ├── scene-000.json
    ├── scene-001.json
    └── ...
```

## Summary JSON Structure

```json
{
  "sessionId": "vision-capture-1234567890",
  "startTime": "2024-01-15T10:30:45.123Z",
  "endTime": "2024-01-15T10:31:15.456Z",
  "runtime": {
    "agentId": "vision-test-1234567890",
    "characterName": "Vision Test Agent"
  },
  "camera": {
    "id": "0",
    "name": "FaceTime HD Camera",
    "connected": true
  },
  "captures": [...],
  "statistics": {
    "totalFrames": 60,
    "totalSceneChanges": 15,
    "totalObjectsDetected": 234,
    "totalPeopleDetected": 12,
    "averageChangePercentage": 32.5,
    "objectTypeCounts": {
      "large-object": 120,
      "medium-object": 80,
      "person-candidate": 12,
      "small-object": 22
    },
    "poseCounts": {
      "standing": 8,
      "sitting": 4
    }
  }
}
```

## Use Cases

1. **Performance Analysis**: See how often the scene changes and triggers VLM updates
2. **Motion Detection Testing**: Analyze object and person detection accuracy
3. **VLM Response Quality**: Review scene descriptions over time
4. **Debugging**: Identify issues with camera integration or scene analysis
5. **Dataset Creation**: Collect vision data for training or testing

## Requirements

- Camera connected to your system
- Camera capture tool installed:
  - macOS: `brew install imagesnap`
  - Linux: `sudo apt-get install fswebcam`
  - Windows: ffmpeg in PATH

## Using Real Vision Models

By default, the test uses mock responses for image analysis. To use real AI vision models:

### OpenAI Vision (Recommended)

1. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Create a `.env` file in the plugin directory:
   ```bash
   OPENAI_API_KEY=sk-your-api-key-here
   ```
3. Run the test - it will automatically use OpenAI's GPT-4o-mini vision model

When using real vision models, you'll get:
- Detailed descriptions of people, their clothing, poses, and activities
- Accurate object identification (computers, furniture, etc.)
- Scene context and lighting conditions
- Spatial relationships between elements

### Example Real vs Mock Output

**Mock Response:**
```
"I see a scene with various objects and details. The lighting appears normal and there are some items visible in the frame."
```

**Real OpenAI Response:**
```
"I see a person with curly hair wearing a black hoodie, sitting at a desk and working on a computer. They appear to be coding, as there's a large monitor displaying what looks like code or a development environment. The desk has a laptop, keyboard, mouse, and other typical office items. The setting appears to be a home office or workspace with wooden doors visible in the background."
```

## Notes

- The test runs for exactly 30 seconds
- Progress is logged every 5 seconds
- All images are saved as JPEG files
- Scene data includes full VLM descriptions and detected objects
- The test gracefully handles environments without cameras 