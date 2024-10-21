// src/routes/productsmanagement/index.ts
import express from 'express';
import ingredientsRoutes from './ingredients';
import suppliersRoutes from './supplier';
import productsRoutes from './products';
import unitsRoutes from './units';
import brandsRoutes from './brands';

const router = express.Router();

// Define the sub-route under /productsmanagement
router.use('/ingredients', ingredientsRoutes);
router.use('/brands', brandsRoutes);
router.use('/products',productsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/units', unitsRoutes);

export default router;
