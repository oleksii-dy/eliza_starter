# Notion Integration Plugin

This plugin provides integration with Notion's API, allowing ElizaOS to retrieve and update data from Notion databases and pages.

## Setup Requirements

1. **Create a Notion Integration** in [Notion Developers](https://developers.notion.com/)
2. **Obtain the required API credentials:**
   - **NOTION_API_KEY** → This is the `Internal Integration Secret` generated when creating the integration.
   - **NOTION_DATABASE_ID** → The unique identifier of the Notion database you want to interact with.

### How to Get Your Notion API Credentials

#### 🔹 **1. Get the Notion API Key**
- After creating an integration, you will receive an **Internal Integration Secret**.
- This secret key acts as your **API Key**, which should be stored in `NOTION_API_KEY`.

#### 🔹 **2. Get the Notion Database ID**
##### **Method 1: From the Notion URL**
1. Open **Notion** and navigate to the **database** you want to connect.
2. Look at the URL, which will look like this:
   ```
   https://www.notion.so/19c8a70da16180058b86e85e93c091a9?v=19c8a70da16180a98db4000cd63bcc56&pvs=4
   ```
3. The **Database ID** is the part **before `?v=`**, like:
   ```
   19c8a70da16180058b86e85e93c091a9
   ```
✅ **This is the ID you need to use for the integration!**

##### **Method 2: Using the Notion API**
If you want to retrieve all database IDs programmatically, follow these steps:

1. Install the Notion SDK:
   ```bash
   npm install @notionhq/client
   ```
2. Create a script `listDatabases.js`:
   ```javascript
   import { Client } from "@notionhq/client";
   import "dotenv/config";

   const notion = new Client({ auth: process.env.NOTION_API_KEY });

   async function getDatabases() {
       const response = await notion.search({ filter: { property: "object", value: "database" } });
       console.log(response);
   }

   getDatabases();
   ```
3. Run the script:
   ```bash
   node listDatabases.js
   ```
This will return a **list of databases** along with their IDs.

##### **Granting Access to Your Integration**
Before your integration can access a database:
1. Open the **database** in Notion.
2. Click **"Share"** (top-right corner).
3. **Add your Integration** and grant it access.

### Environment Configuration
Create a `.env` file in your project root with the following configurations:

```env
# Notion API Configuration
NOTION_API_KEY=your-integration-secret
NOTION_DATABASE_ID=your-database-id
```

## Available Actions

### 1. Fetch Notion Data (NOTION_SYNC)
Retrieves data from a specified Notion database.
- **Input**: Notion database ID
- **Output**: List of retrieved database items
- **Example Query**: Fetch all pending tasks

### 2. Update Notion Page (NOTION_UPDATE)
Updates a specific Notion page with new values.
- **Input**: Page ID and new values for properties
- **Output**: Confirmation of the update
- **Example Query**: Mark a task as completed

## Test Prompts

### Fetch Notion Data Test
```
Retrieve all pending tasks from Notion database.
```

### Update Notion Page Test
```
Update the status of the task with ID "12345" to "Completed" in Notion.
```

## Workflow Overview

1️⃣ **User requests a Notion-related action** in ElizaOS (e.g., "Get my Notion tasks").
2️⃣ **ElizaOS invokes the corresponding action** (`NOTION_SYNC` or `NOTION_UPDATE`).
3️⃣ **The plugin interacts with the Notion API**, performing data retrieval or updates.
4️⃣ **ElizaOS returns the processed response** to the user.

## Possible Expansions

🔹 Support for creating new Notion pages dynamically.
🔹 Enhanced filtering options for database queries.
🔹 Automated reminders and notifications based on Notion data.

## License
This plugin is open-source and available under the **MIT License**.

