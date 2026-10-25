import mongoose from 'mongoose';

// A customer account: someone who browses the marketplace and books services.
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    // True once the customer proved they own the address with an emailed code.
    emailVerified: { type: Boolean, default: false },
    // Category ids picked at signup. Used for recommendations before any history exists.
    interests: { type: [String], default: [] },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', customerSchema);
