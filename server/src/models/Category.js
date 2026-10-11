import mongoose from 'mongoose';
import { defineModel } from './define.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 200 },
    icon: { type: String, default: 'sparkles' }, // lucide-react icon name, rendered client-side
    color: { type: String, default: '#08B981' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category = defineModel('Category', categorySchema);
export default Category;
