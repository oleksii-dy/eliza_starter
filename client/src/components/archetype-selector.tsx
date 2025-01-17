import React, { useState } from "react";
import { ArchetypeName, archetypes } from "../types/archetypes";
import { apiClient } from "@/lib/api";
import { useParams } from "react-router";
import { type UUID } from "@elizaos/core";

export const ArchetypeSelector: React.FC = () => {
    const { agentId } = useParams<{ agentId: UUID }>();

    const [isApplying, setIsApplying] = useState(false);
    const [selectedArchetype, setSelectedArchetype] =
        useState<ArchetypeName | null>(null);
    const [applyStatus, setApplyStatus] = useState<string | null>(null);

    const handleDownload = () => {
        if (!selectedArchetype) return;

        // const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
        //     JSON.stringify(archetypes[selectedArchetype], null, 2)
        // )}`;
        // const downloadAnchorNode = document.createElement("a");
        // downloadAnchorNode.setAttribute("href", dataStr);
        // downloadAnchorNode.setAttribute(
        //     "download",
        //     `${selectedArchetype}.json`
        // );
        // document.body.appendChild(downloadAnchorNode);
        // downloadAnchorNode.click();
        // downloadAnchorNode.remove();

        //
        const blob = new Blob(
            [JSON.stringify(archetypes[selectedArchetype], null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedArchetype}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleApply = async () => {
        if (!selectedArchetype) return;

        if (
            !window.confirm(
                `Are you sure you want to apply the ${selectedArchetype} archetype?`
            )
        )
            return;

        try {
            setIsApplying(true);
            await apiClient.applyArchetype(
                agentId,
                archetypes[selectedArchetype]
            );
            setApplyStatus("success");
        } catch (error) {
            console.error("Failed to apply archetype:", error);
            setApplyStatus(
                `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        } finally {
            setIsApplying(false);
        }

        setTimeout(() => setApplyStatus(null), 3000);
    };

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">
                Character Archetype Selector
            </h2>
            <div className="mb-4">
                <label
                    htmlFor="archetype-select"
                    className="block text-sm font-medium"
                >
                    Select an Archetype
                </label>
                <select
                    id="archetype-select"
                    className="mt-2 p-2 border rounded"
                    onChange={(e) =>
                        setSelectedArchetype(e.target.value as ArchetypeName)
                    }
                >
                    <option value="">-- Select --</option>
                    {Object.keys(ArchetypeName).map((key) => (
                        <option key={key} value={key}>
                            {key}
                        </option>
                    ))}
                </select>
            </div>

            {selectedArchetype && (
                <div>
                    <h3 className="text-md font-semibold">Preview</h3>
                    <pre className="p-4 bg-gray-800 text-white rounded border overflow-auto">
                        {JSON.stringify(archetypes[selectedArchetype], null, 2)}
                    </pre>
                </div>
            )}

            <div className="flex gap-4 mt-4">
                <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    disabled={!selectedArchetype}
                >
                    Download Archetype
                </button>

                <button
                    onClick={handleApply}
                    className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                    disabled={!selectedArchetype || !agentId || isApplying}
                >
                    {isApplying ? "Applying..." : "Apply Archetype"}
                </button>
            </div>

            {applyStatus === "success" && (
                <div className="mt-2 text-green-600">
                    Archetype applied successfully!
                </div>
            )}

            {applyStatus === "error" && (
                <div className="mt-2 text-red-600">
                    Failed to apply archetype. Please try again.
                </div>
            )}
        </div>
    );
};
