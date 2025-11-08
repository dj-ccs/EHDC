import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  console.log('Creating users...');
  const adminPassword = await hashPassword('admin123');
  const stewardPassword = await hashPassword('steward123');
  const userPassword = await hashPassword('user123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brothernature.org' },
    update: {},
    create: {
      email: 'admin@brothernature.org',
      username: 'admin',
      displayName: 'Platform Administrator',
      passwordHash: adminPassword,
      role: 'ADMIN',
      bio: 'Platform administrator and ecosystem steward',
      isVerified: true,
    },
  });

  const steward = await prisma.user.upsert({
    where: { email: 'steward@brothernature.org' },
    update: {},
    create: {
      email: 'steward@brothernature.org',
      username: 'steward1',
      displayName: 'Community Steward',
      passwordHash: stewardPassword,
      role: 'STEWARD',
      bio: 'Community steward facilitating regenerative discussions',
      location: 'Deniliquin, NSW, Australia',
      isVerified: true,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'farmer@example.com' },
    update: {},
    create: {
      email: 'farmer@example.com',
      username: 'regenerative_farmer',
      displayName: 'Sarah Chen',
      passwordHash: userPassword,
      role: 'USER',
      bio: 'Regenerative agriculture practitioner, focusing on soil health',
      location: 'Riverina, NSW, Australia',
    },
  });

  console.log(`✅ Created users: ${admin.username}, ${steward.username}, ${user1.username}`);

  // Create test communities
  console.log('Creating communities...');

  const ausDenil = await prisma.community.create({
    data: {
      country: 'aus',
      region: 'deniliquin',
      category: 'soil-health',
      name: 'Deniliquin Soil Health',
      description: 'Discussion forum for regenerative soil practices in the Deniliquin region',
      slug: 'aus-deniliquin-soil-health',
    },
  });

  const ausRiverina = await prisma.community.create({
    data: {
      country: 'aus',
      region: 'riverina',
      category: 'water-management',
      name: 'Riverina Water Management',
      description: 'Water conservation and management strategies for the Riverina',
      slug: 'aus-riverina-water-management',
    },
  });

  const nzCanterbury = await prisma.community.create({
    data: {
      country: 'nz',
      region: 'canterbury',
      category: 'regenerative-practices',
      name: 'Canterbury Regenerative Practices',
      description: 'Sharing regenerative agriculture knowledge in Canterbury',
      slug: 'nz-canterbury-regenerative-practices',
    },
  });

  console.log(`✅ Created communities: ${ausDenil.name}, ${ausRiverina.name}, ${nzCanterbury.name}`);

  // Create community memberships
  console.log('Creating memberships...');

  await prisma.communityMember.createMany({
    data: [
      { userId: steward.id, communityId: ausDenil.id, role: 'STEWARD' },
      { userId: steward.id, communityId: ausRiverina.id, role: 'STEWARD' },
      { userId: user1.id, communityId: ausDenil.id, role: 'MEMBER' },
      { userId: user1.id, communityId: ausRiverina.id, role: 'MEMBER' },
    ],
  });

  console.log('✅ Created memberships');

  // Create sample posts
  console.log('Creating posts...');

  const post1 = await prisma.post.create({
    data: {
      title: 'Introduction to Regenerative Soil Practices',
      content: `# Welcome to Deniliquin Soil Health

I'm excited to share some insights from my journey with regenerative agriculture. Over the past 5 years, I've seen dramatic improvements in soil health on my property through:

- **Cover cropping**: Maintaining living roots year-round
- **Minimal tillage**: Preserving soil structure
- **Diverse rotations**: Building biological diversity
- **Compost application**: Feeding the soil food web

Looking forward to learning from this community!`,
      contentType: 'markdown',
      authorId: user1.id,
      communityId: ausDenil.id,
      threadDepth: 0,
    },
  });

  const reply1 = await prisma.post.create({
    data: {
      content: `This is fantastic! I've been experimenting with cover crops for 2 years now. What species mix have you found most effective for our climate?`,
      contentType: 'markdown',
      authorId: steward.id,
      communityId: ausDenil.id,
      parentPostId: post1.id,
      threadDepth: 1,
    },
  });

  const reply2 = await prisma.post.create({
    data: {
      content: `Great question! For our region, I've had success with:
- Oats and field peas in winter
- Cowpeas and Japanese millet in summer
- Always include at least one legume for nitrogen fixation

The key is diversity - more species means more ecosystem functions.`,
      contentType: 'markdown',
      authorId: user1.id,
      communityId: ausDenil.id,
      parentPostId: reply1.id,
      threadDepth: 2,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: 'Water Retention Strategies for Dry Seasons',
      content: `With increasingly variable rainfall patterns, I'm looking for proven strategies to improve water retention on farm. What's working for you?`,
      contentType: 'markdown',
      authorId: steward.id,
      communityId: ausRiverina.id,
      threadDepth: 0,
    },
  });

  console.log(`✅ Created posts and replies`);

  // Create a sample synthesis
  console.log('Creating synthesis artifact...');

  await prisma.synthesisArtifact.create({
    data: {
      title: 'Synthesis: Regenerative Soil Practices Discussion',
      summary: `This thread initiated by Sarah Chen explores practical regenerative soil practices in the Deniliquin region. Key focus on cover cropping strategies, with specific species recommendations for local climate conditions. The conversation demonstrates strong community knowledge sharing around nitrogen fixation and ecosystem diversity principles.`,
      keyPoints: JSON.stringify([
        'Cover cropping is central to regenerative practice',
        'Species diversity drives multiple ecosystem functions',
        'Winter mix: oats and field peas recommended',
        'Summer mix: cowpeas and Japanese millet',
        'Always include legumes for nitrogen fixation',
      ],
      synthesisType: 'thread',
      aiModel: 'manual-seed',
      threadRootId: post1.id,
      createdById: steward.id,
    },
  });

  console.log('✅ Created synthesis artifact');

  console.log('\n🎉 Database seeding complete!\n');
  console.log('Test accounts:');
  console.log('  Admin:   admin@brothernature.org / admin123');
  console.log('  Steward: steward@brothernature.org / steward123');
  console.log('  User:    farmer@example.com / user123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
