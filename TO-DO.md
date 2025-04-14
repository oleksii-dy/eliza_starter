✅ Step-by-Step Instructions

1. Clone the existing Twitter plugin
We'll use the built-in Twitter plugin as a base.

cd packages/plugins
cp -r plugin-twitter plugin-my-twitter
This duplicates the existing plugin so we can modify it without breaking the original.

2. Rename the plugin
Open plugin-my-twitter/package.json and change:

{
  "name": "@elizaos/plugin-my-twitter",
  ...
}
This gives the plugin a unique name.

3. Rename the client class
Open plugin-my-twitter/src/client.ts, and:

Rename the exported class from TwitterClient to MyTwitterClient
Update the client name used internally:
export class MyTwitterClient extends Client {
  static clientName = 'my-twitter';
  ...
}
4. Edit the plugin entry point
Open plugin-my-twitter/src/index.ts and change:

import { MyTwitterClient } from './client';

export default {
  clients: [MyTwitterClient],
};
This tells Eliza to register your new client class.

5. Update the agent config to use your client
In your agent’s character file (e.g. characters/tommy.json), modify:

{
  "plugins": [
    "@elizaos/plugin-my-twitter"
  ],
  "clients": ["my-twitter"],
  "clientConfig": {
    "my-twitter": {
      "autoPost": {
        "enabled": true,
        "minTimeBetweenPosts": 60,
        "maxTimeBetweenPosts": 300
      }
    }
  },
  "secrets": {
    "TWITTER_BEARER_TOKEN": "your-bearer-token",
    "TWITTER_API_KEY": "...",
    "TWITTER_API_SECRET": "...",
    "TWITTER_ACCESS_TOKEN": "...",
    "TWITTER_ACCESS_SECRET": "..."
  }
}
📝 The secrets fields depend on the Twitter API library you're using. The default Eliza plugin uses twitter-api-v2.
6. Update API authentication (if needed)
In plugin-my-twitter/src/client.ts, set up the Twitter API using secrets. For example, using twitter-api-v2:

import { TwitterApi } from 'twitter-api-v2';

this.api = new TwitterApi({
  appKey: this.secrets.TWITTER_API_KEY,
  appSecret: this.secrets.TWITTER_API_SECRET,
  accessToken: this.secrets.TWITTER_ACCESS_TOKEN,
  accessSecret: this.secrets.TWITTER_ACCESS_SECRET,
});
7. Implement send and receive behavior
Still in client.ts, implement the basic methods:

// To post a message
async sendMessage(message) {
  await this.api.v2.tweet(message.content);
}

// To handle an incoming tweet (optional)
async handleIncomingMessage(tweetData) {
  this.emit('message', {
    content: tweetData.text,
    authorId: tweetData.author_id,
    // other fields
  });
}
If you're only doing outbound tweets (posting), you can skip handleIncomingMessage.

8. Rebuild and run Eliza
From the root of the Eliza repo:

pnpm install
pnpm build
pnpm dev
If the plugin is configured correctly, you should see Eliza load with your my-twitter client.

✅ Summary

Task	File Path
Clone Twitter plugin	packages/plugins/
Rename plugin + package	plugin-my-twitter/package.json
Rename class + identifier	plugin-my-twitter/src/client.ts
Register client	plugin-my-twitter/src/index.ts
Use client in character	characters/your-agent.json
Add Twitter API secrets	In the same agent JSON under "secrets"
Post messages to Twitter	Implement sendMessage() in your custom client class
🔚 Done!