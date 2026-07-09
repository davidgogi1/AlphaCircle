import 'dotenv/config';
import { v4 as uuid } from 'uuid';
import mongoose from 'mongoose';
import Invite from '../models/Invite';
import User from '../models/User';

async function run() {
  const email = process.argv[2];
  if (!email) { console.error('Usage: npx tsx src/scripts/createInvite.ts <email>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI!);

  const admin = await User.findOne({}).lean();
  if (!admin) { console.error('No users found'); process.exit(1); }

  const token     = uuid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Invite.create({ email: email.toLowerCase(), token, invitedBy: admin._id, expiresAt });

  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  console.log(`\n✅ Invite created for ${email}`);
  console.log(`\n🔗 Link:\n   ${appUrl}?invite=${token}\n`);

  await mongoose.disconnect();
}

run().catch(console.error);
