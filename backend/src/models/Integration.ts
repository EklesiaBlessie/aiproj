import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationProvider = 'jira' | 'slack' | 'notion' | 'github' | 'confluence' | 'linear';
export type IntegrationStatus = 'connected' | 'disconnected';

export interface IIntegration extends Document {
  owner: mongoose.Types.ObjectId;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['jira', 'slack', 'notion', 'github', 'confluence', 'linear'],
      required: true,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected'],
      default: 'connected',
    },
    credentials: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
    },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique compound index so a user cannot connect the same provider multiple times
IntegrationSchema.index({ owner: 1, provider: 1 }, { unique: true });

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
