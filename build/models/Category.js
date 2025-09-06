"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const categorySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category", default: null },
    parentslug: { type: String, default: null },
    filters: { type: [String], default: [] },
});
// Add virtual for subcategories
categorySchema.virtual("subcategories", {
    ref: "Category",
    localField: "_id",
    foreignField: "parent",
});
// Ensure virtuals are included in toJSON output
categorySchema.set("toJSON", { virtuals: true });
const CategoryModel = mongoose_1.default.models.Category ||
    mongoose_1.default.model("Category", categorySchema);
exports.default = CategoryModel;
