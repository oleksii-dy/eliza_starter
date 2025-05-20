import React from "react";
import { MemoryItem } from "./graph-view";

export default function ListView({ memories, onSelect }: { memories: MemoryItem[]; onSelect: (m: MemoryItem) => void }) {
    return (
        <div className="space-y-2 overflow-auto">
            {memories.map((m) => (
                <div key={m.id} className="p-2 border rounded" onClick={() => onSelect(m)}>
                    {m.content.text}
                </div>
            ))}
        </div>
    );
}
