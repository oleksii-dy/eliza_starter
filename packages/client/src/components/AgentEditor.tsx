import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { ConnectionErrorBanner } from './ConnectionErrorBanner';
import EnvSettings from './EnvSettings';
import { AgentLogViewer } from './AgentLogViewer';
import OnboardingTour from './OnboardingTour';
import { Toaster } from './ui/toaster';
import { TooltipProvider } from './ui/tooltip';
import { AuthProvider } from '../context/AuthContext';
import { ConnectionProvider } from '../context/ConnectionContext';
import { STALE_TIMES } from '../hooks/use-query-hooks';
import useVersion from '../hooks/use-version';
import '../index.css';
import { apiClient } from '../lib/api';
import Chat from '../routes/chat';
import AgentCreatorRoute from '../routes/createAgent';
import Home from '../routes/home';
import NotFound from '../routes/not-found';
import GroupChannel from '../routes/group';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import CreateGroupPage from '../routes/group-new';
import AgentSettingsRoute from '../routes/agent-settings';
import clientLogger from '@/lib/logger';

// Configuration interface for AgentEditor
export interface AgentEditorConfig {
  apiUrl?: string;
  apiKey?: string;
  embeddedMode?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  user?: {
    id: string;
    email: string;
    name: string;
  };
  organizationId?: string;
  requiredPlugins?: string[];
  platformUrl?: string;
  onAgentCreated?: (agent: { id: string; name: string; [key: string]: unknown }) => void;
  onAgentUpdated?: (agent: { id: string; name: string; [key: string]: unknown }) => void;
  onError?: (error: Error) => void;
}

// Create a query client with optimized settings
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.STANDARD,
        refetchInterval: false,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });

function AppContent({ config }: { config: AgentEditorConfig }) {
  const _version = useVersion();

  useEffect(() => {
    // Configure API client if URL provided
    if (config.apiUrl) {
      apiClient.defaults.baseURL = config.apiUrl;
    }

    // Set API key if provided
    if (config.apiKey) {
      apiClient.defaults.headers.common['X-API-KEY'] = config.apiKey;
    }

    // Configure logger for embedded mode
    if (config.embeddedMode) {
      clientLogger.setLevel('warn'); // Reduce noise in embedded mode
    }
  }, [config]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className={`h-full w-full ${config.embeddedMode ? 'embedded-editor' : ''}`}
      data-theme={config.theme || 'dark'}
    >
      <TooltipProvider>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <div className="flex h-full flex-col">
              <ConnectionErrorBanner />

              {/* Mobile menu for embedded mode */}
              {config.embeddedMode && (
                <div className="lg:hidden border-b border-gray-200 p-2">
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Menu className="h-4 w-4" />
                        <span className="ml-2">Menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <AppSidebar />
                    </SheetContent>
                  </Sheet>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/agent/:agentId" element={<Chat />} />
                  <Route path="/agent/:agentId/settings" element={<AgentSettingsRoute />} />
                  <Route path="/create-agent" element={<AgentCreatorRoute />} />
                  <Route path="/group/:groupId" element={<GroupChannel />} />
                  <Route path="/create-group" element={<CreateGroupPage />} />
                  <Route path="/logs" element={<AgentLogViewer />} />
                  <Route path="/env-settings" element={<EnvSettings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>

        <Toaster />
        <OnboardingTour />
      </TooltipProvider>
    </div>
  );
}

/**
 * Embeddable AgentEditor component
 *
 * This component provides a complete agent management interface that can be
 * embedded in other applications. It supports configuration via props and
 * handles its own routing internally.
 */
export function AgentEditor(config: AgentEditorConfig = {}) {
  const [queryClient] = useState(() => createQueryClient());

  // Apply theme to container
  const themeClass = config.theme === 'light' ? '' : 'dark';

  // Handle errors if callback provided
  const _handleError = (error: Error) => {
    console.error('AgentEditor Error:', error);
    config.onError?.(error);
  };

  return (
    <div className={`agent-editor-container ${themeClass} antialiased font-sans`}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConnectionProvider>
            <MemoryRouter>
              <AppContent config={config} />
            </MemoryRouter>
          </ConnectionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default AgentEditor;
