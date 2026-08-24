import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { RoadmapItem } from '../models/RoadmapItem';

async function seedRoadmap(): Promise<void> {
  await connectDB();

  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@example.com';
  let user = await User.findOne({ email: demoEmail });

  if (!user && !process.env.DEMO_USER_EMAIL) {
    // Try secondary default fallback
    user = await User.findOne({ email: 'pm@example.com' });
  }

  if (!user) {
    console.error(`❌ Error: No user found with email "${demoEmail}" (or "pm@example.com").`);
    console.error(`   Please run the server and sign in/register first, or specify DEMO_USER_EMAIL.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`👤 Found demo user: ${user.name} (${user.email}) - ID: ${user._id}`);

  const itemsToSeed = [
    // Q4 2026
    {
      title: "Enhance Real-time GPS Tracking accuracy",
      quarter: "Q4 2026",
      lane: "Core",
      status: "in_progress" as const,
      effort: "L",
      team: "Core Logistics",
    },
    {
      title: "Implement Multi-Region Database Sharding",
      quarter: "Q4 2026",
      lane: "Platform",
      status: "planned" as const,
      effort: "XL",
      team: "Platform Infrastructure",
    },
    {
      title: "Launch Loyalty Program Points System",
      quarter: "Q4 2026",
      lane: "Growth",
      status: "planned" as const,
      effort: "M",
      team: "Growth & Retention",
    },
    {
      title: "Redesign Order Checkout UI",
      quarter: "Q4 2026",
      lane: "Core",
      status: "planned" as const,
      effort: "M",
      team: "Core UI/UX",
    },
    // Q1 2027
    {
      title: "Referral Bonus Program V2",
      quarter: "Q1 2027",
      lane: "Growth",
      status: "planned" as const,
      effort: "S",
      team: "Growth & Retention",
    },
    {
      title: "Integration with Apple Pay & Google Wallet",
      quarter: "Q1 2027",
      lane: "Core",
      status: "planned" as const,
      effort: "M",
      team: "Core Checkout",
    },
    {
      title: "Automated Fraud Detection Pipeline",
      quarter: "Q1 2027",
      lane: "Platform",
      status: "planned" as const,
      effort: "L",
      team: "Security & Platform",
    },
    {
      title: "Kubernetes Autoscaler Optimization",
      quarter: "Q1 2027",
      lane: "Platform",
      status: "planned" as const,
      effort: "S",
      team: "DevOps",
    },
  ];

  const nextOrderMap = new Map<string, number>();
  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of itemsToSeed) {
    const existing = await RoadmapItem.findOne({
      owner: user._id,
      title: item.title,
      quarter: item.quarter,
    });

    if (existing) {
      console.log(`   ⏭️  Skipped (already exists): "${item.title}" in ${item.quarter}`);
      skippedCount++;
      continue;
    }

    const key = `${item.quarter}:${item.lane || ''}`;
    let order = nextOrderMap.get(key);

    if (order === undefined) {
      const lastItem = await RoadmapItem.findOne({
        owner: user._id,
        quarter: item.quarter,
        lane: item.lane || null,
      })
        .sort({ order: -1 })
        .lean();
      order = lastItem ? lastItem.order + 1 : 0;
    }

    await RoadmapItem.create({
      ...item,
      owner: user._id,
      order: order,
    });

    console.log(`   ✅ Seeded: "${item.title}" in ${item.quarter} (lane: ${item.lane}, order: ${order})`);
    nextOrderMap.set(key, order + 1);
    insertedCount++;
  }

  console.log(`\n🎉 Seed completed! ${insertedCount} items inserted, ${skippedCount} items skipped.`);
  await mongoose.disconnect();
  console.log('🔌 MongoDB disconnected cleanly.');
}

seedRoadmap().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
