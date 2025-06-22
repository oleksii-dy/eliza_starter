import { vi } from 'vitest';

const ForceGraph = vi.fn(() => ({
  graphData: vi.fn().mockReturnThis(),
  nodeAutoColorBy: vi.fn().mockReturnThis(),
  nodeCanvasObject: vi.fn().mockReturnThis(),
  linkDirectionalParticles: vi.fn().mockReturnThis(),
  linkDirectionalParticleSpeed: vi.fn().mockReturnThis(),
  onNodeClick: vi.fn().mockReturnThis(),
  onNodeHover: vi.fn().mockReturnThis(),
  d3Force: vi.fn().mockReturnThis(),
  d3AlphaDecay: vi.fn().mockReturnThis(),
  d3VelocityDecay: vi.fn().mockReturnThis(),
  warmupTicks: vi.fn().mockReturnThis(),
  cooldownTicks: vi.fn().mockReturnThis(),
  width: vi.fn().mockReturnThis(),
  height: vi.fn().mockReturnThis(),
  backgroundColor: vi.fn().mockReturnThis(),
  nodeLabel: vi.fn().mockReturnThis(),
  linkLabel: vi.fn().mockReturnThis(),
  linkColor: vi.fn().mockReturnThis(),
  linkWidth: vi.fn().mockReturnThis(),
  nodeRelSize: vi.fn().mockReturnThis(),
  refresh: vi.fn(),
  zoom: vi.fn(),
  centerAt: vi.fn(),
}));

export default ForceGraph; 