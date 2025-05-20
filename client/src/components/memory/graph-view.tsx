import { ForceGraph2D, NodeObject } from "react-force-graph";
import React from "react";
import { computePCA } from "./pca";

export interface MemoryItem {
    id: string;
    content: { text: string };
    embedding?: number[];
}

export default function GraphView({ memories, onSelect }: { memories: MemoryItem[]; onSelect: (m: MemoryItem) => void; }) {
    const graphData = React.useMemo(() => {
        const embed = memories
            .filter((m) => m.embedding)
            .map((m) => m.embedding as number[]);
        const coords = computePCA(embed, 2);
        const nodes = memories.map((m, i) => ({
            id: m.id,
            memory: m,
            x: coords[i]?.[0] || 0,
            y: coords[i]?.[1] || 0,
        }));
        return { nodes, links: [] as any[] };
    }, [memories]);

    return (
        <ForceGraph2D
            graphData={graphData}
            nodeAutoColorBy="id"
            nodeLabel={(node: NodeObject) => (node as any).memory.content.text}
            onNodeClick={(node) => onSelect((node as any).memory)}
        />
    );
}
