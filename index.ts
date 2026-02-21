import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { resolvers } from './graphql/resolvers';
import { createContext, GraphQLContext } from './graphql/types/context';
import { typeDefs } from './graphql/types/schema';

const app = express();
const PORT = process.env.PORT || 3000;

// Create Apollo Server
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: true,
  includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',
});

// Initialize Apollo Server
let serverStarted = false;

async function startServer() {
  if (!serverStarted) {
    await server.start();
    serverStarted = true;
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GraphQL endpoint (need to start server first)
app.use('/graphql', async (req, res, next) => {
  await startServer();
  return expressMiddleware(server, {
    context: createContext,
  })(req, res, next);
});

// Health check endpoint (outside GraphQL for monitoring)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// Start server (only when not in serverless environment)
if (process.env.VERCEL !== '1') {
  startServer().then(() => {
    app.listen(PORT, () => {
      console.log(`ManaLedger GraphQL API server running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
    });
  });
}

// Export for serverless (Vercel)
// For serverless, we need to ensure server is started on each request
export default async function handler(req: any, res: any) {
  await startServer();
  return app(req, res);
}
