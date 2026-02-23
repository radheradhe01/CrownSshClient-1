import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

export interface IVM extends Document {
  name: string;
  ip: string;
  username: string;
  password?: string;
  port: number;
  environmentId?: string; // We'll store the Environment ID as a string or ObjectId
  isPinned?: boolean;
}

const VMSchema: Schema = new Schema({
  name: { type: String, required: true },
  ip: { type: String, required: true },
  username: { type: String, required: true },
  password: {
    type: String,
    get: (v: string | undefined) => (v ? decrypt(v) : v),
    set: (v: string | undefined) => (v ? encrypt(v) : v),
  },
  port: { type: Number, default: 22 },
  environmentId: { type: String, index: true }, // Indexed for performance
  isPinned: { type: Boolean, default: false },
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Text index for search
VMSchema.index({ name: 'text', ip: 'text', username: 'text' });

export const VMModel = mongoose.model<IVM>('VM', VMSchema);
