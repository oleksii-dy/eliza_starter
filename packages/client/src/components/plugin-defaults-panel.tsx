import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Users,
  Zap,
  Database,
  Wrench,
  DollarSign,
  Code,
  Building,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';
import {
  usePluginConfigurations,
  useUpdatePluginConfiguration,
  useToggleComponent,
} from '@/hooks/use-plugin-configurations';
import { apiClient as api } from '@/lib/api';

// Plugin category icons
const CATEGORY_ICONS = {
  'high-level': Users,
  'financial': DollarSign,
  'infrastructure': Building,
  'utility': Wrench,
  'development': Code,
  'core': Database,
} as const;

// Risk level colors and icons
const RISK_LEVELS = {
  safe: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Safe' },
  low: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Info, label: 'Low Risk' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle, label: 'Medium Risk' },
  high: { color: 'text-orange-600', bg: 'bg-orange-50', icon: ShieldAlert, label: 'High Risk' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', icon: Shield, label: 'Critical Risk' },
} as const;

interface PluginDefaults {
  category: string;
  riskLevel: string;
  serviceDefaults: boolean;
  providerDefaults: boolean;
  evaluatorDefaults: boolean;
  actionDefaults: boolean;
  customDefaults?: Record<string, { enabled: boolean; disabledReason?: string }>;
  recommendations?: string[];
}

interface PluginDefaultsPanelProps {
  agentId: string;
  plugins: string[];
  isOpen: boolean;
  onClose: () => void;
}

// Fetch plugin defaults from the backend API
const fetchPluginDefaults = async (pluginName: string): Promise<PluginDefaults> => {
  try {
    const response = await api.getPluginDefaults(pluginName);
    if (response.success) {
      return {
        category: response.data.category,
        riskLevel: response.data.riskLevel,
        serviceDefaults: response.data.serviceDefaults,
        providerDefaults: response.data.providerDefaults,
        evaluatorDefaults: response.data.evaluatorDefaults,
        actionDefaults: response.data.actionDefaults,
        customDefaults: response.data.customDefaults,
        recommendations: response.data.recommendations,
      };
    }
  } catch (error) {
    console.warn(`Failed to fetch defaults for ${pluginName}:`, error);
  }

  // Fall back to safe defaults if API call fails
  return {
    category: 'utility',
    riskLevel: 'medium',
    serviceDefaults: true,
    providerDefaults: true,
    evaluatorDefaults: true,
    actionDefaults: false,
    recommendations: [
      'Unknown plugin - review carefully before enabling actions',
      'Consider enabling only providers and evaluators initially',
      'Test in development environment first'
    ],
  };
};

export default function PluginDefaultsPanel({
  agentId,
  plugins,
  isOpen,
  onClose,
}: PluginDefaultsPanelProps) {
  const { toast } = useToast();
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const [pluginDefaults, setPluginDefaults] = useState<Record<string, PluginDefaults>>({});

  const { data: configurations = {}, isLoading } = usePluginConfigurations(agentId);
  const updatePluginConfiguration = useUpdatePluginConfiguration();
  const toggleComponent = useToggleComponent();

  // Load plugin defaults on mount
  useMemo(() => {
    const loadDefaults = async () => {
      const defaults: Record<string, PluginDefaults> = {};
      for (const plugin of plugins) {
        try {
          defaults[plugin] = await fetchPluginDefaults(plugin);
        } catch (error) {
          console.warn(`Failed to load defaults for ${plugin}:`, error);
        }
      }
      setPluginDefaults(defaults);
    };
    loadDefaults();
  }, [plugins]);

  const togglePluginExpansion = (pluginName: string) => {
    setExpandedPlugins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pluginName)) {
        newSet.delete(pluginName);
      } else {
        newSet.add(pluginName);
      }
      return newSet;
    });
  };

  const handleApplyDefaults = async (pluginName: string) => {
    try {
      const response = await api.applyPluginDefaults(agentId, pluginName);
      
      if (response.success) {
        toast({
          title: 'Defaults Applied',
          description: `Applied intelligent defaults for ${pluginName}`,
        });
      } else {
        throw new Error('Failed to apply defaults');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to apply defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleBulkApplyDefaults = async () => {
    try {
      const response = await api.applyAllPluginDefaults(agentId, plugins);
      
      if (response.success) {
        toast({
          title: 'Bulk Defaults Applied',
          description: `Applied intelligent defaults for ${response.data.appliedCount} plugins`,
        });
        
        if (response.data.failedPlugins.length > 0) {
          toast({
            title: 'Partial Success',
            description: `Some plugins failed: ${response.data.failedPlugins.join(', ')}`,
            variant: 'destructive',
          });
        }
      } else {
        throw new Error('Failed to apply bulk defaults');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to apply bulk defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const getRiskAssessment = (pluginName: string) => {
    const defaults = pluginDefaults[pluginName];
    if (!defaults) return null;

    const riskConfig = RISK_LEVELS[defaults.riskLevel as keyof typeof RISK_LEVELS] || RISK_LEVELS.medium;
    const CategoryIcon = CATEGORY_ICONS[defaults.category as keyof typeof CATEGORY_ICONS] || Layers;

    return { riskConfig, CategoryIcon, defaults };
  };

  const getRecommendations = (pluginName: string): string[] => {
    const defaults = pluginDefaults[pluginName];
    if (!defaults) return [];

    // Use API-provided recommendations if available, otherwise fall back to category-based defaults
    if (defaults.recommendations && defaults.recommendations.length > 0) {
      return defaults.recommendations;
    }

    // Fallback recommendations based on category
    const recommendations: string[] = [];

    switch (defaults.category) {
      case 'financial':
        recommendations.push(
          'Financial plugin - review wallet permissions carefully',
          'Only enable transfer actions if you trust the AI with funds',
          'Consider starting with read-only operations'
        );
        break;
      case 'high-level':
        recommendations.push(
          'High-level plugin - generally safe to enable most features',
          'Good for productivity and automation tasks'
        );
        break;
      case 'infrastructure':
        recommendations.push(
          'Infrastructure plugin - services usually safe to enable',
          'Be cautious with administrative actions'
        );
        break;
      case 'development':
        recommendations.push(
          'Development plugin - safe to enable all features',
          'Designed for testing and development workflows'
        );
        break;
      case 'utility':
        recommendations.push(
          'Utility plugin - most features safe to enable',
          'Review any system-level actions carefully'
        );
        break;
      case 'core':
        recommendations.push(
          'Core plugin - essential for system operation',
          'Generally safe to enable all features'
        );
        break;
    }

    if (defaults.riskLevel === 'high' || defaults.riskLevel === 'critical') {
      recommendations.unshift('⚠️ High-risk plugin - enable with caution');
    }

    return recommendations;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plugin Defaults & Security Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Bulk Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Configure intelligent defaults for {plugins.length} plugins based on their risk profiles.
            </div>
            <Button
              onClick={handleBulkApplyDefaults}
              disabled={updatePluginConfiguration.isLoading}
              size="sm"
            >
              Apply All Defaults
            </Button>
          </div>

          <Separator />

          {/* Plugin List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {plugins.map((pluginName) => {
              const config = configurations[pluginName];
              const isExpanded = expandedPlugins.has(pluginName);
              const assessment = getRiskAssessment(pluginName);
              const recommendations = getRecommendations(pluginName);

              if (!config || !assessment) {
                return (
                  <Card key={pluginName} className="opacity-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{pluginName}</CardTitle>
                      <CardDescription>Loading configuration...</CardDescription>
                    </CardHeader>
                  </Card>
                );
              }

              const { riskConfig, CategoryIcon, defaults } = assessment;
              const RiskIcon = riskConfig.icon;

              return (
                <Card key={pluginName} className="transition-all duration-200">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => togglePluginExpansion(pluginName)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <CategoryIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-sm">{pluginName}</CardTitle>
                              <CardDescription className="text-xs">
                                {defaults.category} plugin
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={clsx(
                                'text-xs',
                                riskConfig.color,
                                riskConfig.bg
                              )}
                            >
                              <RiskIcon className="h-3 w-3 mr-1" />
                              {riskConfig.label}
                            </Badge>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyDefaults(pluginName);
                              }}
                              disabled={updatePluginConfiguration.isLoading}
                              size="sm"
                              variant="outline"
                            >
                              Apply Defaults
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {/* Risk Assessment */}
                        <div className="mb-4 p-3 rounded-lg bg-gray-50">
                          <h4 className="font-medium text-sm mb-2">Security Assessment</h4>
                          <div className="space-y-1">
                            {recommendations.map((rec, index) => (
                              <div key={index} className="text-xs text-gray-600 flex items-start gap-2">
                                <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Component Defaults */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg border">
                            <Database className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                            <div className="text-xs font-medium">Services</div>
                            <div className="text-xs text-gray-500">
                              {defaults.serviceDefaults ? 'Enabled' : 'Disabled'} by default
                            </div>
                            <div className="text-xs text-gray-400">
                              {Object.keys(config.services || {}).length} services
                            </div>
                          </div>

                          <div className="text-center p-3 rounded-lg border">
                            <Zap className="h-5 w-5 mx-auto mb-1 text-green-500" />
                            <div className="text-xs font-medium">Providers</div>
                            <div className="text-xs text-gray-500">
                              {defaults.providerDefaults ? 'Enabled' : 'Disabled'} by default
                            </div>
                            <div className="text-xs text-gray-400">
                              {Object.keys(config.providers || {}).length} providers
                            </div>
                          </div>

                          <div className="text-center p-3 rounded-lg border">
                            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                            <div className="text-xs font-medium">Evaluators</div>
                            <div className="text-xs text-gray-500">
                              {defaults.evaluatorDefaults ? 'Enabled' : 'Disabled'} by default
                            </div>
                            <div className="text-xs text-gray-400">
                              {Object.keys(config.evaluators || {}).length} evaluators
                            </div>
                          </div>

                          <div className="text-center p-3 rounded-lg border">
                            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                            <div className="text-xs font-medium">Actions</div>
                            <div className="text-xs text-gray-500">
                              {defaults.actionDefaults ? 'Enabled' : 'Disabled'} by default
                            </div>
                            <div className="text-xs text-gray-400">
                              {Object.keys(config.actions || {}).length} actions
                            </div>
                          </div>
                        </div>

                        {/* Custom Action Defaults */}
                        {defaults.customDefaults && Object.keys(defaults.customDefaults).length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-sm mb-2">Custom Action Defaults</h4>
                            <div className="space-y-2">
                              {Object.entries(defaults.customDefaults).map(([actionName, customDefault]) => (
                                <div key={actionName} className="flex items-center justify-between text-xs p-2 rounded border">
                                  <div>
                                    <span className="font-medium">{actionName}</span>
                                    {customDefault.disabledReason && (
                                      <div className="text-gray-500 mt-1">{customDefault.disabledReason}</div>
                                    )}
                                  </div>
                                  <Badge variant={customDefault.enabled ? 'default' : 'secondary'}>
                                    {customDefault.enabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}