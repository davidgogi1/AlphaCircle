import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User';
import ChatGroup from '../models/ChatGroup';
import ChatGroupMessage from '../models/ChatGroupMessage';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Find all users
  const users = await User.find({}, 'username _id').lean();
  console.log('Users:', users.map(u => `${u.username} (${u._id})`).join(', '));

  // Find the chat group
  const groups = await ChatGroup.find().populate('members.user', 'username').lean();
  console.log('Groups:', groups.map(g => `${g.name} (${g._id})`).join(', '));

  if (groups.length === 0) { console.log('No groups found'); await mongoose.disconnect(); return; }
  const group = groups[0];
  console.log('Using group:', group.name);
  console.log('Current members:', (group.members as any[]).map((m: any) => `${m.user.username} (${m.status})`).join(', '));

  const david1 = users.find(u => u.username === 'David1');
  const david3 = users.find(u => u.username === 'David3');

  if (!david1 || !david3) {
    console.log('Could not find David1 or David3');
    await mongoose.disconnect();
    return;
  }

  // Pick up to 2 other users (not David1 or David3) to add to the group
  const others = users.filter(u => u.username !== 'David1' && u.username !== 'David3').slice(0, 2);
  console.log('Adding to group:', others.map(u => u.username).join(', '));

  // Add new members (accepted) if not already in
  const groupDoc = await ChatGroup.findById(group._id);
  if (!groupDoc) { await mongoose.disconnect(); return; }

  for (const u of others) {
    const already = groupDoc.members.some(m => m.user.toString() === u._id.toString());
    if (!already) {
      groupDoc.members.push({ user: new mongoose.Types.ObjectId(u._id.toString()), status: 'accepted' } as any);
      console.log(`Added ${u.username} as accepted member`);
    }
  }
  await groupDoc.save();

  // Delete existing messages so the conversation is fresh
  await ChatGroupMessage.deleteMany({ group: group._id });

  // Participants who will send messages (not David1)
  const senders = [david3, ...others];
  const gid = group._id.toString();

  const conversation = [
    { sender: david3._id, content: "Morning everyone. Did anyone catch the Fed comments yesterday?" },
    { sender: others[0]?._id ?? david3._id, content: "Yeah, Powell sounded more hawkish than expected. Treasury yields jumped pretty hard after." },
    { sender: others[1]?._id ?? david3._id, content: "2yr broke above 5% again. Market's pricing out the September cut now." },
    { sender: david3._id, content: "I trimmed my duration exposure last week. Starting to feel like the soft landing narrative is getting stretched." },
    { sender: others[0]?._id ?? david3._id, content: "Agree. Credit spreads are still tight though, which is odd. IG barely moved." },
    { sender: others[1]?._id ?? david3._id, content: "HY is where it gets interesting. CCC spreads have been compressing all Q2. Feels complacent." },
    { sender: david3._id, content: "We ran some stress tests on our HY book. If rates stay at 5%+ for 12 months, refinancing wall in 2026 gets ugly." },
    { sender: others[0]?._id ?? david3._id, content: "Same concern on our end. We've been rotating out of single-B names with heavy floating rate debt." },
    { sender: others[1]?._id ?? david3._id, content: "Any views on EM here? EM debt got smacked but some local currency stuff looks interesting." },
    { sender: david3._id, content: "Brazil and Mexico stand out. Real rates are genuinely attractive. Political risk is the wildcard obviously." },
    { sender: others[0]?._id ?? david3._id, content: "Mexico especially — nearshoring flow is real. We've been building a position in Mbono." },
    { sender: others[1]?._id ?? david3._id, content: "Smart. Dollar strength headwind though if the Fed doesn't cut until Q4." },
    { sender: david3._id, content: "Sure but if you're long duration in EM local, you're already accepting FX vol. That's the trade." },
  ];

  // Spread messages over the past few hours with slight offsets
  const now = Date.now();
  for (let i = 0; i < conversation.length; i++) {
    const { sender, content } = conversation[i];
    if (!sender) continue;
    const minutesAgo = (conversation.length - i) * 4 + Math.floor(Math.random() * 2);
    await ChatGroupMessage.create({
      group:     group._id,
      sender:    sender,
      content,
      createdAt: new Date(now - minutesAgo * 60 * 1000),
    });
  }

  console.log(`Inserted ${conversation.length} messages`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
