import mongoose, { Document } from "mongoose";

interface ICategory {
  name: string;
  slug: string;
  parent?: mongoose.Types.ObjectId;
  parentslug?: string;
  filters: string[];
  subcategories?: ICategory[];
}

interface ICategoryDocument extends ICategory, Document {}

const categorySchema = new mongoose.Schema<ICategoryDocument>({
  name: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
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

const CategoryModel = mongoose.models.Category || 
  mongoose.model<ICategoryDocument>("Category", categorySchema);

export default CategoryModel;