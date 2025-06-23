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
import { ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
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

interface PluginRegistryInfo {
    git?: {
        repo: string;
        v1?: {
            version: string;
            branch: string;
        };
    };
    npm?: {
        repo: string;
        v1?: string;
    };
    supports: {
        v0: boolean;
        v1: boolean;
    };
}

// Cache for fetched plugin configs to avoid repeated API calls
const pluginConfigCache = new Map<string, EnvVarConfig[]>();

/**
 * Fetches the plugin registry from GitHub
 */
async function fetchPluginRegistry(): Promise<Record<string, PluginRegistryInfo>> {
    try {
        const response = await fetch('https://raw.githubusercontent.com/elizaos-plugins/registry/main/generated-registry.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch registry: ${response.status}`);
        }
        const data = await response.json();
        return data.registry || {};
    } catch (error) {
        console.error('Error fetching plugin registry:', error);
        return {};
    }
}

/**
 * Fetches the package.json from a plugin's GitHub repository
 */
async function fetchPluginPackageJson(repoUrl: string, branch: string = 'main'): Promise<any> {
    try {
        // Convert GitHub repo URL to raw content URL
        const rawUrl = repoUrl
            .replace('https://github.com/', 'https://raw.githubusercontent.com/')
            .replace(/\.git$/, '') + `/${branch}/package.json`;

        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch package.json: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching package.json:', error);
        return null;
    }
}

/**
 * Extracts environment variable configurations from plugin's agentConfig.pluginParameters
 */
function extractEnvVarConfigs(pluginParameters: Record<string, any>): EnvVarConfig[] {
    if (!pluginParameters) return [];

    return Object.entries(pluginParameters).map(([key, config]) => ({
        name: config.name || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()),
        key,
        required: config.required !== false, // Default to required unless explicitly false
        description: config.description || `Configuration for ${key}`,
        url: config.url || '',
        secret: config.secret !== false, // Default to secret unless explicitly false
    }));
}

/**
 * Dynamically fetches environment variable requirements for a plugin
 */
async function fetchPluginEnvVars(pluginName: string): Promise<EnvVarConfig[]> {
    // Check cache first
    if (pluginConfigCache.has(pluginName)) {
        return pluginConfigCache.get(pluginName)!;
    }

    try {
        // Fetch plugin registry
        const registry = await fetchPluginRegistry();
        const pluginInfo = registry[pluginName];

        if (!pluginInfo?.git?.repo) {
            console.warn(`No git repository found for plugin: ${pluginName}`);
            return [];
        }

        // Determine branch to use
        const branch = pluginInfo.git.v1?.branch || 'main';

        // Fetch package.json from the plugin's repository
        const packageJson = await fetchPluginPackageJson(pluginInfo.git.repo, branch);

        if (!packageJson?.agentConfig?.pluginParameters) {
            console.warn(`No pluginParameters found in agentConfig for plugin: ${pluginName}`);
            return [];
        }

        // Extract environment variable configurations
        const configs = extractEnvVarConfigs(packageJson.agentConfig.pluginParameters);

        // Cache the result
        pluginConfigCache.set(pluginName, configs);

        return configs;
    } catch (error) {
        console.error(`Error fetching env var configs for ${pluginName}:`, error);
        return [];
    }
}



export default function EnvVarsModal({ isOpen, onClose, onSave, pluginName }: EnvVarsModalProps) {
    const [envVars, setEnvVars] = useState<Record<string, string>>({});
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [configs, setConfigs] = useState<EnvVarConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchPluginEnvVarConfigs();
        }
    }, [isOpen, pluginName]);

    useEffect(() => {
        if (configs.length > 0) {
            // Initialize empty values for all config keys
            const initialValues: Record<string, string> = {};
            configs.forEach((config) => {
                initialValues[config.key] = '';
            });
            setEnvVars(initialValues);
            setShowSecrets({});
        }
    }, [configs]);

    const fetchPluginEnvVarConfigs = async () => {
        setLoading(true);
        try {
            const pluginConfigs = await fetchPluginEnvVars(pluginName);
            setConfigs(pluginConfigs);
        } catch (error) {
            console.error('Error fetching plugin env vars:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch plugin configuration. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

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
                        {loading ? (
                            'Loading plugin configuration...'
                        ) : configs.length > 0 ? (
                            <>The plugin <strong>{pluginName}</strong> requires the following environment variables to function properly.</>
                        ) : (
                            <>The plugin <strong>{pluginName}</strong> does not require any environment variables.</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading plugin configuration...</span>
                    </div>
                ) : (
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
                )}

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleSkip}>
                        Skip for Now
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}