# Supabase Authentication Setup

## Overview

The ManaLedger API is now secured with Supabase authentication. All protected endpoints require a valid JWT token from Supabase.

## Configuration

### Environment Variables

Ensure the following environment variables are set in your `.env` file:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_SECRET_KEY=your-supabase-service-role-key
# OR
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Note:** Use `SUPABASE_SECRET_KEY` for server-side operations. The `SUPABASE_ANON_KEY` can be used but has limited permissions.

## Authentication Flow

### 1. User Sign Up / Sign In

Users should authenticate through Supabase Auth on your frontend:

```javascript
// Using Supabase JS client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// Get the access token
const token = data.session?.access_token
```

### 2. Making Authenticated API Requests

Include the JWT token in the `Authorization` header:

```http
GET /api/card/7a0d78d6-145e-4bbf-a31d-a8f8e6e1a3a0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example with `fetch`:

```javascript
const response = await fetch('http://localhost:3000/api/card/CARD_ID', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

Example with `axios`:

```javascript
const response = await axios.get('http://localhost:3000/api/card/CARD_ID', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

Example with `curl`:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/card/7a0d78d6-145e-4bbf-a31d-a8f8e6e1a3a0
```

## Middleware

### `requireAuth`

Blocks requests without valid authentication.

```typescript
import { requireAuth } from './middleware/auth';

router.get('/protected', requireAuth, async (req, res) => {
  // req.user is available here
  console.log(req.user.id, req.user.email);
});
```

### `optionalAuth`

Attaches user information if a valid token is provided, but doesn't block unauthenticated requests.

```typescript
import { optionalAuth } from './middleware/auth';

router.get('/public', optionalAuth, async (req, res) => {
  // req.user is available only if token was provided
  if (req.user) {
    console.log('Authenticated user:', req.user.email);
  }
});
```

## Protected Endpoints

The following endpoints require authentication:

- `GET /api/card/:scryfallId` - Get card details by Scryfall ID

## Testing Authentication

### Quick Start: Sign Up and Get a Token Without a Frontend

#### Create a New Account

```bash
npm run signup
```

This interactive script will:
1. Prompt for email, password, and confirmation
2. Create a new user account in Supabase
3. Display confirmation status and user information
4. Show your access token (if email confirmation is disabled)

#### Get a Token for Existing Users

If you already have a user in Supabase:

```bash
npm run get-token
```

This interactive script will:
1. Prompt for your email and password
2. Sign you in through Supabase
3. Display your access token and user information
4. Show example curl commands

**Example output:**
```
🔐 Supabase Authentication Token Generator

Email: user@example.com
Password: ****

✅ Authentication successful!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 User Information:
   ID: 123e4567-e89b-12d3-a456-426614174000
   Email: user@example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 Access Token:

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Copy the access token and use it in your API requests!

### 1. Enable Email Auth in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable Email provider
4. Configure email templates if needed

### 2. Create a Test User

You can create a test user either:

- Through the Supabase dashboard (Authentication > Users > Add User)
- Using the Supabase client library in your frontend
- Using the Supabase API

### 3. Get an Access Token

Use Supabase's sign-in method to get an access token:

```javascript
const { data } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test-password'
})

console.log('Token:', data.session.access_token)
```

### 4. Test with Swagger UI

1. Start your API: `npm run dev`
2. Open Swagger UI at `http://localhost:3000/api-docs`
3. Click the **Authorize** button (lock icon)
4. Enter your token in the format: `Bearer YOUR_TOKEN`
5. Click Authorize
6. Try the protected endpoints

### 5. Test with Postman

1. Create a new request
2. Set the URL to your endpoint (e.g., `http://localhost:3000/api/card/CARD_ID`)
3. Go to the Authorization tab
4. Select "Bearer Token" from the Type dropdown
5. Paste your JWT token in the Token field
6. Send the request

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Missing or invalid authorization header. Expected format: Bearer <token>"
}
```

or

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Common Issues

1. **Token expired**: Supabase tokens expire after 1 hour by default. Refresh the token or sign in again.
2. **Missing Bearer prefix**: Ensure the Authorization header is formatted as `Bearer <token>`
3. **Wrong Supabase URL/Key**: Verify your environment variables are correct

## User Information

Once authenticated, the user information is available in `req.user`:

```typescript
router.get('/profile', requireAuth, async (req, res) => {
  res.json({
    userId: req.user.id,
    email: req.user.email,
    // Additional user_metadata fields
  });
});
```

## Row Level Security (RLS)

For additional security, you can implement Row Level Security in Supabase to ensure users can only access their own data:

```sql
-- Example RLS policy for user-specific data
CREATE POLICY "Users can only see their own data"
ON your_table
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

## Production Considerations

1. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit
2. **Token Refresh**: Implement token refresh logic on your frontend
3. **Rate Limiting**: Consider adding rate limiting middleware
4. **CORS**: Configure CORS properly for your frontend domain
5. **Service Role Key**: Keep your service role key secret and never expose it to clients

## Next Steps

- Set up email templates in Supabase
- Configure OAuth providers (Google, GitHub, etc.)
- Implement password reset flow
- Add role-based access control (RBAC)
- Set up refresh token rotation
