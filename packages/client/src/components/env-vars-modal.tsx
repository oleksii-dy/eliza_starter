import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnvVarConfig {
    name: string;
    key: string;
    required: boolean;
    description: string;
    url?: string;
    secret: boolean;
}

interface EnvVarsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (envVars: Record<string, string>) => void;
    pluginName: string;
}

// Environment variable configurations for different plugins
const ENV_VAR_CONFIGS: Record<string, EnvVarConfig[]> = {
    '@elizaos/plugin-openai': [
        {
            name: 'OpenAI API Key',
            key: 'OPENAI_API_KEY',
            required: true,
            description: 'Required for the OpenAI plugin to generate text and embeddings.',
            url: 'https://platform.openai.com/api-keys',
            secret: true,
        },
    ],
    '@elizaos/plugin-anthropic': [
        {
            name: 'Anthropic API Key',
            key: 'ANTHROPIC_API_KEY',
            required: true,
            description: 'Required for the Anthropic plugin to use Claude models.',
            url: 'https://console.anthropic.com/settings/keys',
            secret: true,
        },
    ],
    '@elizaos/plugin-discord': [
        {
            name: 'Discord API Token',
            key: 'DISCORD_API_TOKEN',
            required: false,
            description: 'The bot token for your Discord application. This enables your agent to connect to Discord.',
            url: 'https://discord.com/developers/applications',
            secret: true,
        },
        {
            name: 'Discord Application ID',
            key: 'DISCORD_APPLICATION_ID',
            required: false,
            description: 'The application ID for your Discord bot. Required together with the API token.',
            url: 'https://discord.com/developers/applications',
            secret: false,
        },
    ],
    '@elizaos/plugin-twitter': [
        {
            name: 'Twitter API Key',
            key: 'TWITTER_API_KEY',
            required: false,
            description: 'API Key for Twitter integration.',
            url: 'https://developer.twitter.com/en/portal/dashboard',
            secret: true,
        },
        {
            name: 'Twitter API Secret',
            key: 'TWITTER_API_SECRET',
            required: false,
            description: 'API Secret for Twitter integration.',
            url: 'https://developer.twitter.com/en/portal/dashboard',
            secret: true,
        },
        {
            name: 'Twitter Access Token',
            key: 'TWITTER_ACCESS_TOKEN',
            required: false,
            description: 'Access Token for Twitter integration.',
            url: 'https://developer.twitter.com/en/portal/dashboard',
            secret: true,
        },
        {
            name: 'Twitter Access Token Secret',
            key: 'TWITTER_ACCESS_TOKEN_SECRET',
            required: false,
            description: 'Access Token Secret for Twitter integration.',
            url: 'https://developer.twitter.com/en/portal/dashboard',
            secret: true,
        },
    ],
    '@elizaos/plugin-telegram': [
        {
            name: 'Telegram Bot Token',
            key: 'TELEGRAM_BOT_TOKEN',
            required: false,
            description: 'Bot Token for Telegram integration.',
            url: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
            secret: true,
        },
    ],
    '@elizaos/plugin-elevenlabs': [
        {
            name: 'ElevenLabs API Key',
            key: 'ELEVENLABS_API_KEY',
            required: true,
            description: 'API Key for ElevenLabs voice synthesis.',
            url: 'https://elevenlabs.io/app/settings/api-keys',
            secret: true,
        },
    ],
    '@elizaos/plugin-groq': [
        {
            name: 'Groq API Key',
            key: 'GROQ_API_KEY',
            required: true,
            description: 'API Key for Groq AI inference.',
            url: 'https://console.groq.com/keys',
            secret: true,
        },
    ],
    '@elizaos/plugin-sql': [
        {
            name: 'PostgreSQL URL',
            key: 'POSTGRES_URL',
            required: false,
            description: 'URL for connecting to your PostgreSQL database. Leave empty to use PGLite.',
            url: 'https://neon.tech/docs/connect/connect-from-any-app',
            secret: false,
        },
    ],
};

export default function EnvVarsModal({ isOpen, onClose, onSave, pluginName }: EnvVarsModalProps) {
    const [envVars, setEnvVars] = useState<Record<string, string>>({});
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    const configs = ENV_VAR_CONFIGS[pluginName] || [];

    useEffect(() => {
        if (isOpen) {
            // Initialize empty values for all config keys
            const initialValues: Record<string, string> = {};
            configs.forEach((config) => {
                initialValues[config.key] = '';
            });
            setEnvVars(initialValues);
            setShowSecrets({});
        }
    }, [isOpen, pluginName, configs]);

    const handleInputChange = (key: string, value: string) => {
        setEnvVars((prev: Record<string, string>) => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleSecretVisibility = (key: string) => {
        setShowSecrets((prev: Record<string, boolean>) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = () => {
        // Validate required fields
        const missingRequired = configs.filter(config =>
            config.required && (!envVars[config.key] || envVars[config.key].trim() === '')
        );

        if (missingRequired.length > 0) {
            toast({
                title: 'Missing Required Fields',
                description: `Please fill in: ${missingRequired.map(c => c.name).join(', ')}`,
                variant: 'destructive',
            });
            return;
        }

        // Filter out empty values
        const filteredEnvVars = Object.entries(envVars)
            .filter(([_, value]) => value.trim() !== '')
            .reduce((acc, [key, value]) => {
                acc[key] = value as string;
                return acc;
            }, {} as Record<string, string>);

        onSave(filteredEnvVars);
        onClose();
    };

    const handleSkip = () => {
        onSave({});
        onClose();
    };

    if (configs.length === 0) {
        // No environment variables needed for this plugin
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Environment Variables</DialogTitle>
                    <DialogDescription>
                        The plugin <strong>{pluginName}</strong> requires the following environment variables to function properly.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {configs.map((config) => (
                        <div key={config.key} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor={config.key} className="text-sm font-medium">
                                    {config.name}
                                    {config.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {config.url && (
                                    <a
                                        href={config.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600"
                                        title="Get your API key"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground">{config.description}</p>

                            <div className="relative">
                                <Input
                                    id={config.key}
                                    type={config.secret && !showSecrets[config.key] ? 'password' : 'text'}
                                    value={envVars[config.key] || ''}
                                    onChange={(e) => handleInputChange(config.key, e.target.value)}
                                    placeholder={`Enter your ${config.name.toLowerCase()}`}
                                    className="pr-10"
                                />
                                {config.secret && (
                                    <button
                                        type="button"
                                        onClick={() => toggleSecretVisibility(config.key)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showSecrets[config.key] ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleSkip}>
                        Skip for Now
                    </Button>
                    <Button onClick={handleSave}>
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}