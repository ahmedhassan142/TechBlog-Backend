// src/models/Subscription.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  email: string;
  isVerified: boolean;
  verificationToken: string;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  lastNotified?: Date;
}

const SubscriptionSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    required: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  lastNotified: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
SubscriptionSchema.index({ email: 1 });
SubscriptionSchema.index({ isVerified: 1 });
SubscriptionSchema.index({ subscribedAt: -1 });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);