import { Request, Response, Router } from 'express';
import { importPriceData, importScryfallData, sync } from '../database/import';

const router = Router();

// Types
interface ImportStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastResult: ImportResultStatus | null;
  progress: string | null;
}

interface ImportResultStatus {
  success: boolean;
  type?: string;
  imported?: number;
  errors?: number;
  error?: string;
  timestamp: string;
  duration?: number;
  scryfallResult?: {
    imported: number;
    errors: number;
  };
  priceResult?: {
    imported: number;
    errors: number;
  };
  totalErrors?: number;
}

// Store import status
const importStatus: ImportStatus = {
  isRunning: false,
  lastRun: null,
  lastResult: null,
  progress: null
};

/**
 * @openapi
 * /api/import/status:
 *   get:
 *     tags:
 *       - Import
 *     summary: Get import status
 *     description: Returns the current status of the database import process
 *     responses:
 *       200:
 *         description: Import status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isRunning:
 *                   type: boolean
 *                 lastRun:
 *                   type: string
 *                   format: date-time
 *                 lastResult:
 *                   type: object
 *                 progress:
 *                   type: string
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json(importStatus);
});

/**
 * @openapi
 * /api/import/sync:
 *   post:
 *     tags:
 *       - Import
 *     summary: Start database sync
 *     description: Triggers a full database sync from Scryfall and CardMarket APIs. Clears existing data and imports fresh data.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clearFirst:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to clear existing data before import
 *     responses:
 *       200:
 *         description: Import started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *       409:
 *         description: Import already in progress
 *       500:
 *         description: Error starting import
 */
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  if (importStatus.isRunning) {
    res.status(409).json({
      message: 'Import already in progress',
      status: 'running',
      progress: importStatus.progress
    });
    return;
  }

  const clearFirst = req.body.clearFirst !== false; // Default to true

  // Start import in background
  importStatus.isRunning = true;
  importStatus.progress = 'Starting import...';
  importStatus.lastResult = null;

  // Send immediate response
  res.json({
    message: 'Database sync started',
    status: 'running',
    clearFirst
  });

  // Run import asynchronously
  try {
    console.log(`\n[API] Starting database sync (clear: ${clearFirst})`);
    
    const result = await sync(clearFirst);
    
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Completed';
    
    console.log('[API] Database sync completed successfully');
  } catch (error: any) {
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Failed';
    
    console.error('[API] Database sync failed:', error.message);
  }
});

/**
 * @openapi
 * /api/import/scryfall:
 *   post:
 *     tags:
 *       - Import
 *     summary: Import Scryfall data only
 *     description: Imports only Scryfall card data from the bulk API
 *     responses:
 *       200:
 *         description: Import started
 *       409:
 *         description: Import already in progress
 */
router.post('/scryfall', async (_req: Request, res: Response): Promise<void> => {
  if (importStatus.isRunning) {
    res.status(409).json({
      message: 'Import already in progress',
      status: 'running'
    });
    return;
  }

  importStatus.isRunning = true;
  importStatus.progress = 'Importing Scryfall data...';

  res.json({
    message: 'Scryfall import started',
    status: 'running'
  });

  try {
    const result = await importScryfallData();
    
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: true,
      type: 'scryfall',
      ...result,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Completed';
  } catch (error: any) {
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: false,
      type: 'scryfall',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Failed';
    
    console.error('[API] Scryfall import failed:', error.message);
  }
});

/**
 * @openapi
 * /api/import/prices:
 *   post:
 *     tags:
 *       - Import
 *     summary: Import CardMarket prices only
 *     description: Imports only CardMarket price data
 *     responses:
 *       200:
 *         description: Import started
 *       409:
 *         description: Import already in progress
 */
router.post('/prices', async (_req: Request, res: Response): Promise<void> => {
  if (importStatus.isRunning) {
    res.status(409).json({
      message: 'Import already in progress',
      status: 'running'
    });
    return;
  }

  importStatus.isRunning = true;
  importStatus.progress = 'Importing price data...';

  res.json({
    message: 'Price import started',
    status: 'running'
  });

  try {
    const result = await importPriceData();
    
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: true,
      type: 'prices',
      ...result,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Completed';
  } catch (error: any) {
    importStatus.isRunning = false;
    importStatus.lastRun = new Date().toISOString();
    importStatus.lastResult = {
      success: false,
      type: 'prices',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    importStatus.progress = 'Failed';
    
    console.error('[API] Price import failed:', error.message);
  }
});

export default router;
