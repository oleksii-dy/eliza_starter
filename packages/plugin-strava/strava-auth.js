const axios = require('axios');
const { MongoClient } = require('mongodb');

class StravaAuth {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DATABASE);
    }
    return this.db.collection('strava_tokens');
  }

  async getValidToken(userId) {
    const tokens = await this.connect();
    const tokenDoc = await tokens.findOne({ userId });
    
    if (!tokenDoc) throw new Error('No Strava connection found');
    if (Date.now() / 1000 > tokenDoc.expires_at - process.env.STRAVA_TOKEN_REFRESH_THRESHOLD) {
      return this.refreshToken(tokenDoc);
    }
    
    return tokenDoc.access_token;
  }

  async refreshToken(tokenDoc) {
    const { data } = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokenDoc.refresh_token
    });

    await this.connect().updateOne(
      { userId: tokenDoc.userId },
      { $set: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
      }}
    );

    return data.access_token;
  }

  async getRecentActivities(token) {
    const { data } = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${token}` },
      params: { per_page: 1 }
    });
    return data;
  }
}

module.exports = StravaAuth;