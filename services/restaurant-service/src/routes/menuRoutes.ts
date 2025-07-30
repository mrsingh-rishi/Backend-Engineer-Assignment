import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';
import { MenuService } from '../services/MenuService';
import { authenticateToken, requireRestaurant } from '../middleware/auth';
import { getDatabase } from '../config/database';

const router = Router();

// Initialize services and controllers
let menuController: MenuController;

// Lazy initialization to ensure database is ready
const getMenuController = () => {
  if (!menuController) {
    const db = getDatabase();
    const menuService = new MenuService(db);
    menuController = new MenuController(menuService);
  }
  return menuController;
};

/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: Menu management endpoints
 */

// Menu item routes
router.get('/', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().getMenuItems(req, res, next)
);

router.post('/', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().createMenuItem(req, res, next)
);

router.get('/categories', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().getMenuCategories(req, res, next)
);

router.patch('/bulk-availability', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().bulkUpdateAvailability(req, res, next)
);

router.get('/:id', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().getMenuItem(req, res, next)
);

router.put('/:id', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().updateMenuItem(req, res, next)
);

router.delete('/:id', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().deleteMenuItem(req, res, next)
);

router.patch('/:id/availability', authenticateToken, requireRestaurant, (req: any, res, next) => 
  getMenuController().updateMenuItemAvailability(req, res, next)
);

// DELETE /api/menu/:id
router.delete('/:id', authenticateToken, requireRestaurant, (req, res) => {
  res.json({
    success: true,
    message: 'Delete menu item endpoint - implementation in progress',
    data: {
      service: 'Restaurant Service',
      endpoint: `/menu/${req.params.id}`,
      status: 'under development'
    },
  });
});

export default router;
