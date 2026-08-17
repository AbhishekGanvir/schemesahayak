import express from "express";

import {
  getAllSchemes,
  searchSchemesController,
  getCategories,
  getSchemesByCategory,
  getSchemeById,
  getProfiles,
  getProfileTemplate
} from "../controllers/scheme.controller.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| SCHEMES
|--------------------------------------------------------------------------
*/

/*
GET /api/schemes
*/
router.get(
  "/schemes",
  getAllSchemes
);

/*
GET /api/schemes/search?q=kisan
*/
router.get(
  "/schemes/search",
  searchSchemesController
);

/*
GET /api/schemes/categories
*/
router.get(
  "/schemes/categories",
  getCategories
);

/*
GET /api/schemes/category/farmer
*/
router.get(
  "/schemes/category/:category",
  getSchemesByCategory
);

/*
GET /api/schemes/PM-KISAN
*/
router.get(
  "/schemes/:schemeId",
  getSchemeById
);

router.get(
  "/profiles",
  getProfiles
);

router.get(
  "/profiles/:profileId",
  getProfileTemplate
);

export default router;