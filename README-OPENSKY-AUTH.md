# OpenSky Network Authentication Setup

To use the arrivals and departures features, you need to configure OpenSky Network authentication.

## Quick Setup

1. **Copy environment variables from `.env.example` to `.env`**:
   ```bash
   cp .env.example .env
   ```

2. **Register at OpenSky Network** (if you haven't already):
   - Go to https://opensky-network.org/
   - Create a free account

3. **Get your API credentials**:
   
   ### For OAuth2 (Recommended for new accounts):
   - Log in to your OpenSky account
   - Go to your account settings
   - Create an API client
   - Copy the Client ID and Client Secret
   - Add to your `.env` file:
     ```
     OPENSKY_CLIENT_ID=your_client_id_here
     OPENSKY_CLIENT_SECRET=your_client_secret_here
     ```

   ### For Basic Auth (Legacy, for older accounts):
   - Use your OpenSky username and password
   - Add to your `.env` file:
     ```
     OPENSKY_USERNAME=your_username_here
     OPENSKY_PASSWORD=your_password_here
     ```

4. **Restart your development server** for the changes to take effect.

## Troubleshooting

### "Authentication Required" Error
- Make sure your `.env` file contains the correct credentials
- Ensure there are no quotes around the values in `.env`
- Check that the server was restarted after adding credentials

### Testing Authentication
Visit `/api/flights/auth-status` to check if authentication is properly configured:
- Should return: `{"authType":"oauth2","isAuthenticated":true}` or `{"authType":"basic","isAuthenticated":true}`

### Important Notes
- The free tier has rate limits (100 requests per day for anonymous users)
- Authenticated users get higher rate limits
- OAuth2 is the recommended method for new accounts (accounts created after mid-March 2025)
- Basic Auth is deprecated and will be removed in the future