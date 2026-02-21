import { Request, Response, Router } from 'express';
import { getSupabaseClient } from '../services/supabase';

const router = Router();

/**
 * @openapi
 * /api/card/{scryfallId}:
 *   get:
 *     tags:
 *       - Card
 *     summary: Get card details by Scryfall ID
 *     description: Returns the complete Scryfall card object for the given UUID
 *     parameters:
 *       - in: path
 *         name: scryfallId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scryfall UUID
 *         example: "7a0d78d6-145e-4bbf-a31d-a8f8e6e1a3a0"
 *     responses:
 *       200:
 *         description: Scryfall card object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete Scryfall card object with all card properties
 *       400:
 *         description: Invalid Scryfall ID
 *       404:
 *         description: Card not found
 *       500:
 *         description: Server error
 */
router.get('/:scryfallId', async (req: Request, res: Response): Promise<void> => {
  try {
    const scryfallId = req.params.scryfallId.trim();
    
    if (!scryfallId) {
      res.status(400).json({
        success: false,
        message: 'Invalid Scryfall ID'
      });
      return;
    }
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Query card from database
    const { data: cardData, error } = await supabase
      .from('scryfall_data')
      .select('data')
      .eq('id', scryfallId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: `Card with Scryfall ID ${scryfallId} not found`
        });
        return;
      }
      throw error;
    }
    
    if (!cardData || !cardData.data) {
      res.status(404).json({
        success: false,
        message: `Card with Scryfall ID ${scryfallId} not found`
      });
      return;
    }
    
    // Return just the Scryfall card data
    res.status(200).json(cardData.data);
    
  } catch (error: any) {
    console.error('Error fetching card details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch card details',
      error: error.message
    });
  }
});

export default router;
