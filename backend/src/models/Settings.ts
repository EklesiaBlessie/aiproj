import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  highPriorityAlerts: boolean;
  defaultPageSize: number;
  companyName?: string;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    weeklyDigest: {
      type: Boolean,
      default: false,
    },
    highPriorityAlerts: {
      type: Boolean,
      default: true,
    },
    defaultPageSize: {
      type: Number,
      default: 20,
      min: 1,
      max: 100,
    },
    companyName: {
      type: String,
      trim: true,
    },
    theme: {
      type: String,
      default: 'dark',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
