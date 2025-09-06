"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Category_1 = __importDefault(require("../models/Category"));
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Helper function to build category tree
//@ts-ignore
const buildCategoryTree = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (parentId = null) {
    const categories = yield Category_1.default.find({ parent: parentId });
    return Promise.all(
    //@ts-ignore
    categories.map((category) => __awaiter(void 0, void 0, void 0, function* () {
        //@ts-ignore
        const children = yield buildCategoryTree(category._id.toString());
        return {
            _id: category._id,
            name: category.name,
            slug: category.slug,
            parentslug: category.parentslug,
            subcategories: children,
        };
    })));
});
// Get all categories (tree structure)
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield buildCategoryTree();
        return res.status(200).json({ data: categories });
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({ message: "Failed to fetch categories" });
    }
}));
// Get category by slug
router.get("/slug/:slug", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = yield Category_1.default.findOne({ slug: req.params.slug });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: category
        });
    }
    catch (error) {
        console.error("Error fetching category:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch category"
        });
    }
}));
// Create new category
router.post("/add", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, slug, parentslug } = req.body;
    if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
    }
    try {
        // Check if category with this slug already exists
        const existingCategory = yield Category_1.default.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ message: "Category with this slug already exists" });
        }
        let parent = null;
        if (parentslug && parentslug !== "none") {
            parent = yield Category_1.default.findOne({ slug: parentslug });
            if (!parent) {
                return res.status(404).json({ message: "Parent category not found" });
            }
        }
        const newCategory = new Category_1.default({
            name,
            slug,
            parent: (parent === null || parent === void 0 ? void 0 : parent._id) || null,
            parentslug: (parent === null || parent === void 0 ? void 0 : parent.slug) || null
        });
        yield newCategory.save();
        return res.status(201).json({
            message: "Category created successfully",
            data: newCategory
        });
    }
    catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({
            message: error.message || "Failed to create category"
        });
    }
}));
exports.default = router;
