# OpenSky Network OAuth2 Migration Guide

## Overview

OpenSky Network is deprecating Basic Authentication (username/password) in favor of the more secure OAuth2 Client Credentials flow. This guide will help you migrate your authentication method.

## Important Notice

- **Basic Auth will be discontinued** in the coming months (exact date TBD)
- **All accounts created after mid-March 2025** require OAuth2 authentication
- **Existing accounts** are encouraged to migrate to OAuth2 as soon as possible

## Migration Steps

### 1. Create API Client on OpenSky

1. Log in to your OpenSky Network account at https://opensky-network.org/
2. Navigate to your Account page
3. Look for the "API Client" section
4. Click "Create new API client"
5. Save your `client_id` and `client_secret` securely

### 2. Update Environment Variables

Update your `.env` file with the new OAuth2 credentials:

```bash
# Remove or comment out old Basic Auth credentials
# VITE_OPENSKY_USERNAME=your_old_username
# VITE_OPENSKY_PASSWORD=your_old_password

# Add new OAuth2 credentials
VITE_OPENSKY_CLIENT_ID=your_client_id_here
VITE_OPENSKY_CLIENT_SECRET=your_client_secret_here
```

### 3. Verify Configuration

The application will automatically use OAuth2 if the credentials are present. The authentication priority is:

1. OAuth2 (if `client_id` and `client_secret` are configured)
2. Basic Auth (if `username` and `password` are configured) - **Deprecated**
3. Anonymous access (no authentication)

### 4. Testing Your Setup

After updating your credentials, test the authentication:

```bash
# Start the application
npm run dev

# Check the server logs for authentication status
# You should see: "OpenSky OAuth2 token obtained, expires in 1800 seconds"
```

## Technical Details

### OAuth2 Implementation

- **Token Endpoint**: `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
- **Grant Type**: `client_credentials`
- **Token Expiry**: 30 minutes (1800 seconds)
- **Automatic Refresh**: Tokens are automatically refreshed 5 minutes before expiry

### Rate Limits

- **Anonymous Access**: 10 API calls per minute
- **Authenticated Access**: 1000 API calls per minute

### Security Notes

- OAuth2 credentials are handled server-side only for security
- Tokens are cached in Redis (if available) to minimize token requests
- The client-side application no longer handles authentication directly

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**
   - Verify your `client_id` and `client_secret` are correct
   - Ensure you've created an API client in your OpenSky account
   - Check that your account has API access enabled

2. **Token Expiry Issues**
   - The application automatically refreshes tokens
   - If issues persist, check Redis connectivity for token caching

3. **Rate Limiting**
   - Authenticated requests have much higher rate limits
   - Monitor your usage to stay within limits

### Fallback Behavior

During the transition period, the application will:
1. Try OAuth2 authentication first
2. Fall back to Basic Auth if OAuth2 fails and credentials are available
3. Use anonymous access as a last resort

## Support

For issues specific to:
- **OpenSky API**: Contact OpenSky Network support
- **This Application**: Open an issue in the repository
- **OAuth2 Setup**: Refer to OpenSky's API documentation

## References

- [OpenSky Network API Documentation](https://openskynetwork.github.io/opensky-api/)
- [OAuth2 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)