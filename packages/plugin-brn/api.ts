import {
    elizaLogger,
    IAgentRuntime,
} from "@elizaos/core";

export const getBrnCollectionItems = async (
    data: {
    brn_host: string;
    collectionId: string;
    offset?: number;
    limit?: number;
},
runtime: IAgentRuntime
): Promise<{
    success: boolean;
    data?: string;
    error?: any;
}> => {
    elizaLogger.info("Get Brn collection with option:", data);
    const brnApiKey = runtime.getSetting("BRN_API_KEY");

    try {
        const response = await fetch(
            `${data.brn_host}/items/${data.collectionId}?sort_field=created_at&sort_direction=1&viewed=0&text_cut=false&limit=${data.limit}&offset=${data.offset}`,
            {
                method: "GET",
                headers: {
                    "x-access-token": brnApiKey,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                `Get Brn collection failed: ${response.statusText}`
            );
        }
        const itemsFetch = await response.json();
        let result = '';
        if (itemsFetch.items && itemsFetch.items.length > 0) {
            const items = itemsFetch.items.map((item) => {
                return {
                    title: item?.fields?.title,
                    description: item?.fields?.description,
                    date: item?.fields?.date
                };
            });
            result = JSON.stringify(items);
            for (const item of itemsFetch.items) {
                try {
                    elizaLogger.info("item.item_id", item.item_id);
                    const response = await fetch(
                        `${data.brn_host}/item/${item.item_id}/view`,
                        {
                            method: "POST",
                            headers: {
                                "x-access-token": brnApiKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                viewed: true,
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Set View for item: ${item.item_id}} of the Brn collection failed: ${response.statusText}`
                        );
                    }
                    elizaLogger.info("response",  await response.json());
                } catch (error) {
                    console.error(error);
                }
            }
        }
        return { success: true, data: result };
    } catch (error) {
        console.error(error);
        return { success: false, error: error };
    }
}
