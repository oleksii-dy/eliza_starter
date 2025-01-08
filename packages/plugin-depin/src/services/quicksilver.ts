import axios from "axios";

export async function askQuickSilver(
    content: string
): Promise<string> {
    const response = await axios.post("https://quicksilver.iotex.ai/ask", {
        q: content,
    });

    if (response.data.data) {
        return response.data.data;
    } else {
        throw new Error("Failed to fetch weather data");
    }
}


