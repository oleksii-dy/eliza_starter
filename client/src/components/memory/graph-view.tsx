import { ForceGraph2D, NodeObject } from "react-force-graph";
import React from "react";
import { computePCA } from "./pca";

export interface MemoryItem {
    id: string;
    content: { text: string };
    embedding?: number[];
}

interface MemoryNodeObject extends NodeObject {
  memory: MemoryItem;
}

export default function GraphView({ memories, onSelect }: { memories: MemoryItem[]; onSelect: (m: MemoryItem) => void; }) {
    const graphData = React.useMemo(() => {
        const memoriesWithEmbeddings = memories.filter((m) => m.embedding);
        const embed = memoriesWithEmbeddings.map((m) => m.embedding as number[]);
        const coords = computePCA(embed, 2);

        const pcaCoordsMap = new Map<string, [number, number]>();
        memoriesWithEmbeddings.forEach((m, i) => {
            if (coords[i]) {
                pcaCoordsMap.set(m.id, coords[i] as [number, number]);
            }
        });

        const nodes: MemoryNodeObject[] = memories.map((m) => {
            const nodeCoords = pcaCoordsMap.get(m.id);
            return {
                id: m.id,
                memory: m,
                x: nodeCoords?.[0] || 0,
                y: nodeCoords?.[1] || 0,
            };
        });

        return { nodes, links: [] };
    }, [memories]);

    return (
        <ForceGraph2D
            graphData={graphData}
            nodeAutoColorBy="id"
            nodeLabel={(node: MemoryNodeObject) => node.memory.content.text}
            onNodeClick={(node: MemoryNodeObject) => onSelect(node.memory)}
        />
    );
}
