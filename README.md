# n8n-nodes-ai-coustics-enhance

This is an n8n community node. It lets you use ai-coustics in your n8n workflows.

ai-coustics is an AI-powered speech enhancement service that improves the quality of voice recordings by reducing noise, enhancing clarity, and normalizing audio levels using advanced machine learning models.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The ai-coustics node supports the following operation:

- **Enhance Voice**: Upload an audio file and receive an enhanced version with improved speech clarity, noise reduction, and audio normalization.

### Enhancement Parameters

- **Loudness Target Level**: Target loudness level in LUFS (default: -14, range: -50 to 0)
- **Loudness Peak Limit**: Peak loudness limit in dBFS (default: -1, range: -9 to 0)  
- **Enhancement Level**: Level of audio enhancement to apply (range: 0 to 1, default: 1.0)
- **Transcode Kind**: Output audio format (MP3 or WAV, default: MP3)
- **Model Architecture**: AI model to use for enhancement:
  - **FINCH**: Optimized for voice isolation
  - **LARK**: Legacy model for studio voice
  - **LARK_V2**: Latest studio voice model

### Processing Behavior

The node automatically:
1. Submits your audio file for enhancement
2. Polls the API every 10 seconds (configurable: 5-60 seconds)
3. Waits up to 30 minutes for completion (configurable: 1-60 minutes)
4. Returns the enhanced audio file when ready

## Credentials

To use this node, you need an ai-coustics API key:

1. **Sign up**: Create an account at [ai-coustics developer portal](https://developers.ai-coustics.io/)
2. **Get API Key**: Once registered, you can create an API key for authentication
3. **Configure in n8n**: Add your API key to the ai-coustics API credentials in n8n

### Setting up credentials in n8n:

1. In your n8n workflow, click on the ai-coustics node
2. In the credentials dropdown, select "Create New" 
3. Enter your API key in the "API Key" field
4. Save the credential with a descriptive name

## Compatibility

- **Minimum n8n version**: 0.198.0
- **Node.js version**: >=20.15
- **Tested with**: n8n 1.0+ versions

## Usage

### Basic Workflow

1. **Input**: Connect a node that provides binary audio data (e.g., HTTP Request, File Read, etc.)
2. **Configure**: Set your desired enhancement parameters
3. **Output**: The node returns enhanced audio with metadata

### Input Requirements

- **Binary Data**: The node expects audio files as n8n binary data
- **Supported Formats**: Common audio formats (MP3, WAV, FLAC, etc.)
- **File Size**: Check ai-coustics documentation for current limits

### Output

The node provides:
- **Enhanced Audio**: As binary data in your specified format
- **Processing Metadata**: Including job ID, processing time, and enhancement settings
- **Filename**: Automatically includes model architecture (e.g., `voice_enhanced_lark.mp3`)

### Example Use Cases

- **Podcast Production**: Enhance recorded interviews and episodes
- **Preprocessing for ASR**: Improve word error rate of ASR systems
- **Voice Calls**: Improve quality of recorded meetings or calls  
- **Content Creation**: Clean up voice recordings for videos or presentations
- **Audio Restoration**: Enhance old or low-quality voice recordings

### Configuration Tips

- **For Speech**: LARK_V2 models for best quality and Finch for keeping the voice as close to the original (good for ASR).
- **For Noisy Audio**: Increase enhancement level (0.8-1.0)
- **For Batch Processing**: Adjust polling settings for longer files
- **Output Format**: Choose MP3 for smaller files, WAV for highest quality

## Resources

* [ai-coustics API Documentation](https://developers.ai-coustics.io/documentation)
* [ai-coustics Developer Portal](https://developers.ai-coustics.io/)