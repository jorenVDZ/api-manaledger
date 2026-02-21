import { getSupabaseClient } from '../services/supabase';

export interface GraphQLContext {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
  token?: string;
}

/**
 * Create GraphQL context from Express request
 * Extracts and validates authentication token if present
 */
export async function createContext({ req }: { req: any }): Promise<GraphQLContext> {
  const context: GraphQLContext = {};

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (token) {
        context.token = token;

        // Verify token with Supabase
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (!error && user) {
          context.user = {
            id: user.id,
            email: user.email,
            ...user.user_metadata
          };
        }
      }
    }
  } catch (error) {
    // Silently fail - resolvers will handle authentication requirements
    console.error('Error creating GraphQL context:', error);
  }

  return context;
}
