import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ListView from "./list-view";
import GraphView, { MemoryItem } from "./graph-view";

export default function MemoryTab({ memories }: { memories: MemoryItem[] }) {
    const [selected, setSelected] = React.useState<MemoryItem | null>(null);
    return (
        <Tabs defaultValue="list" className="h-full w-full">
            <div className="p-2 flex flex-col gap-2">
                {selected ? (
                    <div className="p-2 border rounded bg-muted">
                        <div className="font-bold">{selected.content.text}</div>
                    </div>
                ) : (
                    <div className="p-2 border rounded bg-muted">Select a node</div>
                )}
            </div>
            <TabsList>
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="graph">Graph</TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="h-[calc(100%-4rem)] overflow-auto">
                <ListView memories={memories} onSelect={setSelected} />
            </TabsContent>
            <TabsContent value="graph" className="h-[calc(100%-4rem)] overflow-auto">
                <GraphView memories={memories} onSelect={setSelected} />
            </TabsContent>
        </Tabs>
    );
}
