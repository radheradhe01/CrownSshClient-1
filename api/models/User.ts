import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'user';

export interface IUser extends Document {
    googleId: string;
    displayName: string;
    email: string;
    photo?: string;
    role: UserRole;
    totpSecret?: string;
    isTotpEnabled: boolean;
}

const UserSchema: Schema = new Schema({
    googleId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
    photo: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    totpSecret: { type: String },
    isTotpEnabled: { type: Boolean, default: false },
}, {
    timestamps: true,
});

export const User = mongoose.model<IUser>('User', UserSchema);
