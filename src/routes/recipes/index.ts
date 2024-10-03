// src/routes/productsmanagement/index.ts
import express from 'express';
import recipesRoutes from './recipes';

const router = express.Router();

// Define the sub-route under /productsmanagement
router.use('/recipes', recipesRoutes);

export default router;