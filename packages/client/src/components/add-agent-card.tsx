import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Plus, Sparkles, Bot } from 'lucide-react';

const AddAgentCard: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/create');
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 bg-card/50 hover:bg-card/80 transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleClick}
      onKeyPress={(e) => e.key === 'Enter' && handleClick()}
      tabIndex={0}
      role="button"
      aria-label="Create new agent"
    >
      {/* Enhanced visual header */}
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-primary/10">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-primary/20 group-hover:via-primary/20 transition-all duration-500" />
          <Bot className="absolute top-6 left-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors duration-300" />
          <Sparkles className="absolute bottom-6 right-6 w-6 h-6 text-primary/10 group-hover:text-primary/20 transition-colors duration-300" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Outer ring with subtle animation */}
            <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-dashed border-primary/20 group-hover:border-primary/40 group-hover:rotate-180 transition-all duration-1000" />

            {/* Main icon container */}
            <div className="relative w-20 h-20 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            </div>

            {/* Sparkle effects on hover */}
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-4 h-4 bg-primary/20 rounded-full animate-ping" />
            </div>
            <div className="absolute -bottom-2 -left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
              <div className="w-3 h-3 bg-primary/30 rounded-full animate-ping" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced content section */}
      <div className="p-6 text-center space-y-2">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors duration-300">
          Create New Agent
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add an AI agent to your workspace and start building intelligent conversations
        </p>

        {/* Subtle call-to-action indicator */}
        <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center gap-1 text-xs text-primary">
            <span>Click to get started</span>
            <Sparkles className="w-3 h-3 animate-pulse" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AddAgentCard;
