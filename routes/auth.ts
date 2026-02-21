import { Request, Response, Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user information
 *     description: Returns the authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error: any) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: error.message
    });
  }
});

/**
 * @openapi
 * /api/auth/verify:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Verify authentication token (optional)
 *     description: Checks if the provided token is valid. Returns user info if authenticated, or indicates unauthenticated status.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.get('/verify', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      res.status(200).json({
        authenticated: true,
        user: req.user
      });
    } else {
      res.status(200).json({
        authenticated: false,
        message: 'No valid authentication token provided'
      });
    }
  } catch (error: any) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token',
      error: error.message
    });
  }
});

export default router;
