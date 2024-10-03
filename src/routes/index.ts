// src/routes/index.ts
import express from 'express';
import authRoutes from './auth';
import productsManagementRoutes from './productsmanagement';
import recipeRoutes from './recipes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/productsmanagement',productsManagementRoutes);
router.use('/recipesmanagement', recipeRoutes);

export default router;
