const express = require('express');
const router = express.Router();
const cardMarketService = require('../services/cardMarketService');

/**
 * @openapi
 * /api/cardmarket/sync:
 *   post:
 *     tags:
 *       - CardMarket
 *     summary: Sync CardMarket data
 *     description: Downloads price guide and product data from CardMarket and saves to local storage
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: CardMarket sync completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     syncedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2026-02-20T10:30:00.000Z
 *                     filesDownloaded:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["price_guide_1.json", "products_singles_1.json"]
 *                     duration:
 *                       type: string
 *                       description: Duration of sync operation
 *                       example: "5.42s"
 *       500:
 *         description: Sync failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to sync CardMarket data
 *                 error:
 *                   type: string
 *                   example: Connection timeout
 */
router.post('/sync', async (req, res) => {
  try {
    console.log('CardMarket sync initiated');
    const data = await cardMarketService.syncCardMarketData();
    
    res.status(200).json({
      success: true,
      message: 'CardMarket sync completed successfully',
      data
    });
    
  } catch (error) {
    console.error('Error syncing CardMarket data:', error);
    cardMarketService.markSyncFailed(error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync CardMarket data',
      error: error.message
    });
  }
});

/**
 * @openapi
 * /api/cardmarket/sync/status:
 *   get:
 *     tags:
 *       - CardMarket
 *     summary: Get sync status
 *     description: Returns the current status and information about the last sync operation
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2026-02-20T10:30:00.000Z"
 *                     status:
 *                       type: string
 *                       enum: [idle, syncing, completed, failed]
 *                       example: completed
 *                     message:
 *                       type: string
 *                       example: Sync completed successfully
 *                     filesDownloaded:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["price_guide_1.json", "products_singles_1.json"]
 *                     duration:
 *                       type: string
 *                       description: Duration of last sync operation
 *                       example: "5.42s"
 *       500:
 *         description: Failed to fetch status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch sync status
 *                 error:
 *                   type: string
 *                   example: Database connection error
 */
router.get('/sync/status', async (req, res) => {
  try {
    const data = cardMarketService.getSyncStatus();
    res.status(200).json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync status',
      error: error.message
    });
  }
});

module.exports = router;
