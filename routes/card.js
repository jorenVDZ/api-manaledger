const express = require('express');
const router = express.Router();
const cardMarketService = require('../services/cardMarketService');

/**
 * @openapi
 * /api/card/{productId}:
 *   get:
 *     tags:
 *       - Card
 *     summary: Get card details by CardMarket Product ID
 *     description: Fetches card information from local CardMarket data and enriches it with Scryfall data
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: CardMarket Product ID
 *         example: 379041
 *     responses:
 *       200:
 *         description: Card details retrieved successfully
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
 *                     productId:
 *                       type: integer
 *                       example: 379041
 *                     name:
 *                       type: string
 *                       example: "Embodiment of Agonies"
 *                     cardmarket:
 *                       type: object
 *                       description: CardMarket product and pricing data
 *                     scryfall:
 *                       type: object
 *                       description: Scryfall card data
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Card not found
 *       503:
 *         description: Data not available
 *       500:
 *         description: Server error
 */
router.get('/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }
    
    const cardData = await cardMarketService.getCardByProductId(productId);
    
    if (!cardData) {
      return res.status(404).json({
        success: false,
        message: `Card with Product ID ${productId} not found in CardMarket data`
      });
    }
    
    res.status(200).json({
      success: true,
      data: cardData
    });
    
  } catch (error) {
    console.error('Error fetching card details:', error);
    
    // Handle specific error cases
    if (error.code === 'ENOENT') {
      return res.status(503).json({
        success: false,
        message: 'CardMarket data not available. Please run sync first.',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch card details',
      error: error.message
    });
  }
});

module.exports = router;
