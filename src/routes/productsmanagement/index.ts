// src/routes/productsmanagement/index.ts
import express from 'express';
import productsRoutes from './products';
import supplierstoresRoutes from './supplierstores';
import proudctvariantsRoutes from './productvariants';
import unitsRoutes from './units';
import brandsRoutes from './brands';

const router = express.Router();

// Define the sub-route under /productsmanagement
router.use('/products', productsRoutes);
router.use('/brands', brandsRoutes);
router.use('/productvariants',proudctvariantsRoutes);
router.use('/supplierstores', supplierstoresRoutes);
router.use('/units', unitsRoutes);

export default router;
