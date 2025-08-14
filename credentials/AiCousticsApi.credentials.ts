import {
    IAuthenticateGeneric,
    ICredentialType,
    INodeProperties
} from 'n8n-workflow';

export class AiCousticsApi implements ICredentialType {
    name = 'aiCousticsApi';
    displayName = 'Ai-Coustics API';
    documentationUrl = 'https://developers.ai-coustics.io/documentation';
    properties: INodeProperties[] = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            default: '',
            typeOptions: {
                password: true,
            },
            required: true,
            description: 'The API key for ai-coustics API',
        },
    ];

    // This allows the credential to be used by other parts of n8n
    // stating how this credential is injected as part of the request
    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };
}
