import { Buffer } from 'buffer';
import type {
    IBinaryData,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

declare const setTimeout: (callback: () => void, ms: number) => any;

export class AiCoustics implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ai-coustics',
        name: 'aiCoustics',
        icon: { light: 'file:aic-logo-dark.svg', dark: 'file:aic-logo-dark.svg' },
        group: ['transform'],
        version: 1,
        subtitle: 'Enhance Speech Audio',
        description: 'Enhance speech audio files using ai-coustics API and wait for completion',
        defaults: {
            name: 'ai-coustics',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'aiCousticsApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary property containing the audio file',
            },
            {
                displayName: 'Loudness Target Level',
                name: 'loudnessTargetLevel',
                type: 'number',
                default: -14,
                description: 'Target loudness level in LUFS',
                typeOptions: {
                    minValue: -50,
                    maxValue: 0,
                },
            },
            {
                displayName: 'Loudness Peak Limit',
                name: 'loudnessPeakLimit',
                type: 'number',
                default: -1,
                description: 'Peak loudness limit in dBFS',
                typeOptions: {
                    minValue: -50,
                    maxValue: 0,
                },
            },
            {
                displayName: 'Enhancement Level',
                name: 'enhancementLevel',
                type: 'number',
                default: 1.0,
                description: 'Level of audio enhancement to apply (0 to 1)',
                typeOptions: {
                    minValue: 0,
                    maxValue: 1,
                    numberStepSize: 0.1,
                },
            },
            {
                displayName: 'Transcode Kind',
                name: 'transcodeKind',
                type: 'options',
                options: [
                    {
                        name: 'MP3',
                        value: 'MP3',
                    },
                    {
                        name: 'WAV',
                        value: 'WAV',
                    },
                ],
                default: 'MP3',
                description: 'Output audio format',
            },
            {
                displayName: 'Model Architecture',
                name: 'modelArch',
                type: 'options',
                options: [
                    {
                        name: 'FINCH',
                        value: 'FINCH',
                    },
                    {
                        name: 'LARK',
                        value: 'LARK',
                    },
                    {
                        name: 'LARK V2',
                        value: 'LARK_V2',
                    },
                ],
                default: 'LARK',
                description: 'AI model architecture to use for enhancement',
            },
            {
                displayName: 'Output Binary Property',
                name: 'outputBinaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                description: 'Name of the binary property for the enhanced audio file',
            },
            {
                displayName: 'The node will automatically poll the API until enhancement is complete or times out.',
                name: 'pollingNotice',
                type: 'notice',
                default: '',
            },
            {
                displayName: 'Poll Interval (seconds)',
                name: 'pollInterval',
                type: 'number',
                default: 10,
                description: 'How often to check for job completion (in seconds)',
                typeOptions: {
                    minValue: 5,
                    maxValue: 60,
                },
            },
            {
                displayName: 'Max Wait Time (minutes)',
                name: 'maxWaitTime',
                type: 'number',
                default: 30,
                description: 'Maximum time to wait for job completion (in minutes)',
                typeOptions: {
                    minValue: 1,
                    maxValue: 60,
                },
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
                const loudnessTargetLevel = this.getNodeParameter('loudnessTargetLevel', itemIndex) as number;
                const loudnessPeakLimit = this.getNodeParameter('loudnessPeakLimit', itemIndex) as number;
                const enhancementLevel = this.getNodeParameter('enhancementLevel', itemIndex) as number;
                const transcodeKind = this.getNodeParameter('transcodeKind', itemIndex) as string;
                const modelArch = this.getNodeParameter('modelArch', itemIndex) as string;
                const outputBinaryPropertyName = this.getNodeParameter('outputBinaryPropertyName', itemIndex) as string;
                const pollInterval = this.getNodeParameter('pollInterval', itemIndex) as number;
                const maxWaitTime = this.getNodeParameter('maxWaitTime', itemIndex) as number;

                const item = items[itemIndex];

                if (!item.binary || !item.binary[binaryPropertyName]) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `No binary data found in property "${binaryPropertyName}"`,
                        { itemIndex }
                    );
                }

                const binaryData = item.binary[binaryPropertyName] as IBinaryData;

                // Get the binary data buffer
                const binaryBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

                const credentials = await this.getCredentials('aiCousticsApi');

                // Prepare form data for multipart request
                const formData = {
                    file: {
                        value: binaryBuffer,
                        options: {
                            filename: binaryData.fileName || 'audio_file',
                            contentType: binaryData.mimeType,
                        },
                    },
                    loudness_target_level: loudnessTargetLevel.toString(),
                    loudness_peak_limit: loudnessPeakLimit.toString(),
                    enhancement_level: enhancementLevel.toString(),
                    transcode_kind: transcodeKind,
                    model_arch: modelArch,
                };

                // Make the API request to submit the enhancement job
                const submitResponse = await this.helpers.request({
                    method: 'POST',
                    url: 'https://api.ai-coustics.io/v1/media/enhance',
                    headers: {
                        'X-API-Key': credentials.apiKey as string,
                    },
                    formData,
                    json: true,
                });

                const jobId = submitResponse.generated_name;

                // Calculate polling parameters
                const maxAttempts = Math.floor((maxWaitTime * 60) / pollInterval);
                const pollIntervalMs = pollInterval * 1000;

                let attempts = 0;
                let jobCompleted = false;
                let enhancedAudioData: any = null;

                // Poll for job completion
                while (attempts < maxAttempts && !jobCompleted) {
                    // Wait before polling (except for the first attempt)
                    if (attempts > 0) {
                        await AiCoustics.sleep(pollIntervalMs);
                    }

                    attempts++;

                    try {
                        // Try to get the enhanced audio file
                        const response = await this.helpers.request({
                            method: 'GET',
                            url: `https://api.ai-coustics.io/v1/media/${jobId}`,
                            headers: {
                                'X-API-Key': credentials.apiKey as string,
                            },
                            encoding: null, // Get raw binary data
                            resolveWithFullResponse: true, // Get headers and status
                        });

                        // If we get here without an error, the job is completed
                        jobCompleted = true;
                        enhancedAudioData = response.body;

                    } catch (error) {
                        if (error.statusCode === 412) {
                            // File has not been processed yet, continue polling
                            continue;
                        } else if (error.statusCode === 404) {
                            // Job not found, might still be initializing, continue polling
                            continue;
                        } else {
                            // Other error, throw it
                            throw new NodeOperationError(
                                this.getNode(),
                                `Enhancement job failed: ${error.message || 'Unknown error'}`,
                                { itemIndex }
                            );
                        }
                    }
                }

                if (!jobCompleted) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Enhancement job timed out after ${maxWaitTime} minutes. Job ID: ${jobId}`,
                        { itemIndex }
                    );
                }

                // Create binary data for the enhanced audio
                // Ensure we have a proper Buffer
                let audioBuffer: Buffer;
                if (Buffer.isBuffer(enhancedAudioData)) {
                    audioBuffer = enhancedAudioData;
                } else if (enhancedAudioData instanceof ArrayBuffer) {
                    audioBuffer = Buffer.from(enhancedAudioData);
                } else if (typeof enhancedAudioData === 'string') {
                    // If it's already base64 encoded, use it directly, otherwise treat as binary string
                    audioBuffer = Buffer.from(enhancedAudioData, 'binary');
                } else {
                    // Fallback: try to convert whatever we have
                    audioBuffer = Buffer.from(enhancedAudioData);
                }

                const enhancedAudioBinary: IBinaryData = {
                    data: audioBuffer.toString('base64'),
                    mimeType: AiCoustics.getMimeTypeFromFormat(transcodeKind),
                    fileName: AiCoustics.getEnhancedFileName(binaryData.fileName || 'audio_file', transcodeKind, modelArch),
                    fileExtension: AiCoustics.getFileExtensionFromFormat(transcodeKind),
                };

                // Create the output item with enhanced audio
                const outputItem: INodeExecutionData = {
                    json: {
                        ...item.json,
                        jobId,
                        enhancementSettings: {
                            loudnessTargetLevel,
                            loudnessPeakLimit,
                            enhancementLevel,
                            transcodeKind,
                            modelArch,
                        },
                        originalFileName: binaryData.fileName,
                        enhancedFileName: enhancedAudioBinary.fileName,
                        status: 'completed',
                        processingTime: `${attempts * pollInterval} seconds`,
                    },
                    binary: {
                        [outputBinaryPropertyName]: enhancedAudioBinary,
                    },
                };

                returnData.push(outputItem);

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: itemIndex,
                    });
                } else {
                    throw new NodeOperationError(this.getNode(), error, { itemIndex });
                }
            }
        }

        return [returnData];
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(resolve, ms);
        });
    }

    private static getMimeTypeFromFormat(format: string): string {
        const mimeTypes: { [key: string]: string } = {
            'MP3': 'audio/mpeg',
            'WAV': 'audio/wav',
        };
        return mimeTypes[format] || 'audio/mpeg';
    }

    private static getFileExtensionFromFormat(format: string): string {
        const extensions: { [key: string]: string } = {
            'MP3': 'mp3',
            'WAV': 'wav',
        };
        return extensions[format] || 'mp3';
    }

    private static getEnhancedFileName(originalFileName: string, format: string, modelArch: string): string {
        const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
        const extension = AiCoustics.getFileExtensionFromFormat(format);
        const modelSuffix = modelArch.toLowerCase().replace('_', '-');
        return `${nameWithoutExt}_enhanced_${modelSuffix}.${extension}`;
    }
}
