
import fs from "fs/promises"
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const files = [
    path.join(__dirname, "../src/data/projects.json"),

];

export const searchProjectInFileJson = async(name:string)=>{
    const results = await Promise.all(
        files.map(async (file) => {
            try {
                const data = await fs.readFile(file, 'utf8');
                const projects = JSON.parse(data);

                const foundCoin = projects.find(
                    project =>
                        project.name.toLowerCase() === name.toLowerCase()
                );

                return foundCoin || null;
            } catch (err) {
                console.error(`Error reading file ${file}:`, err);
                return null;
            }
        })
    );


    return results.find(result => result !== null) || null;
}
