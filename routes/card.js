const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Lazy initialization of Supabase client
let supabase;
function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variable is required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

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
router.get('/:scryfallId', async (req, res) => {
  try {
    const scryfallId = req.params.scryfallId.trim();
    
    if (!scryfallId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Scryfall ID'
      });
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
        return res.status(404).json({
          success: false,
          message: `Card with Scryfall ID ${scryfallId} not found`
        });
      }
      throw error;
    }
    
    if (!cardData || !cardData.data) {
      return res.status(404).json({
        success: false,
        message: `Card with Scryfall ID ${scryfallId} not found`
      });
    }
    
    // Return just the Scryfall card data
    res.status(200).json(cardData.data);
    
  } catch (error) {
    console.error('Error fetching card details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch card details',
      error: error.message
    });
  }
});

module.exports = router;
