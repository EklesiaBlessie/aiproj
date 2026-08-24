import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'product_manager' | 'viewer';

/**
 * Per-user preferences edited from the Settings page (PATCH /api/user).
 *
 * These live on the user document rather than in localStorage so they survive a
 * new browser or device — the Settings page is only honest about "saved" if the
 * value comes back from the database on the next load.
 */
export interface IUserSettings {
  emailNotifications: boolean;
  weeklyDigest: boolean;
  highPriorityAlerts: boolean;
  /** Default rows per page for the feedback table. */
  defaultPageSize: number;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  company?: string;
  settings: IUserSettings;
  createdAt: Date;
  openId?: string;
  loginMethod?: 'local' | 'sso';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    openId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    loginMethod: {
      type: String,
      enum: ['local', 'sso'],
      default: 'local',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'product_manager', 'viewer'],
      default: 'viewer',
    },
    company: {
      type: String,
      trim: true,
    },
    // Defaults are applied here rather than in the controller so users created
    // before this field existed still read back a complete settings object.
    settings: {
      emailNotifications: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
      highPriorityAlerts: { type: Boolean, default: true },
      defaultPageSize: { type: Number, default: 20, min: 1, max: 100 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Pre-save hook: Hash password before saving if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method: Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
