import { PrismaClient, PermissionCategory, PermissionAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// PERMISSION DEFINITIONS
// ============================================

const PERMISSIONS = [
  // Event Permissions
  { name: 'event:create', category: 'EVENT' as PermissionCategory, action: 'CREATE' as PermissionAction, description: 'Create new events' },
  { name: 'event:read', category: 'EVENT' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View events' },
  { name: 'event:update', category: 'EVENT' as PermissionCategory, action: 'UPDATE' as PermissionAction, description: 'Update own events' },
  { name: 'event:delete', category: 'EVENT' as PermissionCategory, action: 'DELETE' as PermissionAction, description: 'Delete own events' },
  { name: 'event:publish', category: 'EVENT' as PermissionCategory, action: 'PUBLISH' as PermissionAction, description: 'Publish events' },
  { name: 'event:unpublish', category: 'EVENT' as PermissionCategory, action: 'UNPUBLISH' as PermissionAction, description: 'Unpublish events' },
  { name: 'event:manage_all', category: 'EVENT' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage all events', isSystem: true },
  { name: 'event:approve', category: 'EVENT' as PermissionCategory, action: 'APPROVE' as PermissionAction, description: 'Approve events', isSystem: true },
  { name: 'event:reject', category: 'EVENT' as PermissionCategory, action: 'REJECT' as PermissionAction, description: 'Reject events', isSystem: true },

  // User Permissions
  { name: 'user:read', category: 'USER' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View user profiles' },
  { name: 'user:update', category: 'USER' as PermissionCategory, action: 'UPDATE' as PermissionAction, description: 'Update user information' },
  { name: 'user:delete', category: 'USER' as PermissionCategory, action: 'DELETE' as PermissionAction, description: 'Delete users', isSystem: true },
  { name: 'user:manage', category: 'USER' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage users', isSystem: true },
  { name: 'user:view_all', category: 'USER' as PermissionCategory, action: 'VIEW_ALL' as PermissionAction, description: 'View all users', isSystem: true },
  { name: 'user:suspend', category: 'USER' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Suspend users', isSystem: true },
  { name: 'user:ban', category: 'USER' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Ban users', isSystem: true },

  // Payment Permissions
  { name: 'payment:read', category: 'PAYMENT' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View payment information' },
  { name: 'payment:create', category: 'PAYMENT' as PermissionCategory, action: 'CREATE' as PermissionAction, description: 'Create payments' },
  { name: 'payment:refund', category: 'PAYMENT' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Process refunds', isSystem: true },
  { name: 'payment:manage', category: 'PAYMENT' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage payments' },
  { name: 'payment:view_all', category: 'PAYMENT' as PermissionCategory, action: 'VIEW_ALL' as PermissionAction, description: 'View all payments', isSystem: true },

  // Social Permissions
  { name: 'social:read', category: 'SOCIAL' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View social content' },
  { name: 'social:create', category: 'SOCIAL' as PermissionCategory, action: 'CREATE' as PermissionAction, description: 'Create social content' },
  { name: 'social:update', category: 'SOCIAL' as PermissionCategory, action: 'UPDATE' as PermissionAction, description: 'Update own social content' },
  { name: 'social:delete', category: 'SOCIAL' as PermissionCategory, action: 'DELETE' as PermissionAction, description: 'Delete own social content' },
  { name: 'social:manage', category: 'SOCIAL' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage all social content', isSystem: true },

  // Review Permissions
  { name: 'review:read', category: 'REVIEW' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View reviews' },
  { name: 'review:create', category: 'REVIEW' as PermissionCategory, action: 'CREATE' as PermissionAction, description: 'Create reviews' },
  { name: 'review:update', category: 'REVIEW' as PermissionCategory, action: 'UPDATE' as PermissionAction, description: 'Update own reviews' },
  { name: 'review:delete', category: 'REVIEW' as PermissionCategory, action: 'DELETE' as PermissionAction, description: 'Delete own reviews' },
  { name: 'review:moderate', category: 'REVIEW' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Moderate reviews', isSystem: true },

  // Moderation Permissions
  { name: 'moderation:view_reports', category: 'MODERATION' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View reports', isSystem: true },
  { name: 'moderation:resolve_reports', category: 'MODERATION' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Resolve reports', isSystem: true },
  { name: 'moderation:ban_users', category: 'MODERATION' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Ban users', isSystem: true },
  { name: 'moderation:delete_content', category: 'MODERATION' as PermissionCategory, action: 'DELETE' as PermissionAction, description: 'Delete any content', isSystem: true },

  // Analytics Permissions
  { name: 'analytics:view', category: 'ANALYTICS' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View own analytics' },
  { name: 'analytics:export', category: 'ANALYTICS' as PermissionCategory, action: 'READ' as PermissionAction, description: 'Export analytics data' },
  { name: 'analytics:view_all', category: 'ANALYTICS' as PermissionCategory, action: 'VIEW_ALL' as PermissionAction, description: 'View all analytics', isSystem: true },

  // System/Admin Permissions
  { name: 'system:settings', category: 'SYSTEM' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage system settings', isSystem: true },
  { name: 'system:feature_flags', category: 'SYSTEM' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage feature flags', isSystem: true },
  { name: 'system:api_keys', category: 'SYSTEM' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage API keys', isSystem: true },
  { name: 'system:webhooks', category: 'SYSTEM' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Manage webhooks', isSystem: true },
  { name: 'system:audit_logs', category: 'SYSTEM' as PermissionCategory, action: 'READ' as PermissionAction, description: 'View audit logs', isSystem: true },
  { name: 'admin:manage_all', category: 'ADMIN' as PermissionCategory, action: 'MANAGE' as PermissionAction, description: 'Full system access', isSystem: true },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        isActive: true,
      },
      create: {
        name: permission.name,
        category: permission.category,
        action: permission.action,
        description: permission.description,
        isSystem: permission.isSystem || false,
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${PERMISSIONS.length} permissions`);
}

async function seedEventCategories() {
  console.log('📂 Seeding event categories...');

  const categories = [
    { name: 'Music & Concerts', slug: 'music-concerts', icon: '🎵', color: '#FF6B6B', description: 'Live music, concerts, and performances' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '🏃', color: '#4ECDC4', description: 'Sports events, fitness classes, and athletic activities' },
    { name: 'Food & Drink', slug: 'food-drink', icon: '🍔', color: '#FFE66D', description: 'Food festivals, cooking classes, and culinary experiences' },
    { name: 'Arts & Culture', slug: 'arts-culture', icon: '🎨', color: '#A8E6CF', description: 'Art exhibitions, cultural events, and creative workshops' },
    { name: 'Technology', slug: 'technology', icon: '💻', color: '#95E1D3', description: 'Tech conferences, hackathons, and innovation events' },
    { name: 'Business', slug: 'business', icon: '💼', color: '#F38181', description: 'Networking events, seminars, and professional development' },
    { name: 'Education', slug: 'education', icon: '📚', color: '#AA96DA', description: 'Workshops, training sessions, and educational programs' },
    { name: 'Entertainment', slug: 'entertainment', icon: '🎭', color: '#FCBAD3', description: 'Comedy shows, theater, and entertainment events' },
    { name: 'Health & Wellness', slug: 'health-wellness', icon: '💪', color: '#FFFFD2', description: 'Yoga, meditation, and wellness activities' },
    { name: 'Outdoor & Adventure', slug: 'outdoor-adventure', icon: '🏕️', color: '#A8D8EA', description: 'Hiking, camping, and outdoor activities' },
    { name: 'Travel & Tourism', slug: 'travel-tourism', icon: '✈️', color: '#FFD93D', description: 'Tours, travel experiences, and exploration' },
    { name: 'Community', slug: 'community', icon: '🤝', color: '#6BCF7F', description: 'Community gatherings and social events' },
    { name: 'Gaming', slug: 'gaming', icon: '🎮', color: '#C492B1', description: 'Gaming tournaments and esports events' },
    { name: 'Fashion & Beauty', slug: 'fashion-beauty', icon: '👗', color: '#FFB6B9', description: 'Fashion shows and beauty events' },
    { name: 'Others', slug: 'others', icon: '📌', color: '#DEDEDE', description: 'Other types of events' },
  ];

  for (const category of categories) {
    await prisma.eventCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  console.log(`✅ Created ${categories.length} event categories`);
}

async function seedInterests() {
  console.log('🏷️ Seeding interests...');

  const interests = [
    'Music', 'Dancing', 'Sports', 'Fitness', 'Yoga', 'Meditation',
    'Cooking', 'Baking', 'Photography', 'Art', 'Painting', 'Drawing',
    'Reading', 'Writing', 'Gaming', 'Technology', 'Coding', 'Design',
    'Travel', 'Hiking', 'Camping', 'Cycling', 'Running', 'Swimming',
    'Fashion', 'Beauty', 'Theater', 'Movies', 'Comedy', 'Networking',
  ];

  for (const interest of interests) {
    await prisma.interest.upsert({
      where: { slug: interest.toLowerCase().replace(/\s+/g, '-') },
      update: { name: interest },
      create: {
        name: interest,
        slug: interest.toLowerCase().replace(/\s+/g, '-'),
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${interests.length} interests`);
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('Admin@12345', 10);

  // Super Admin
  const admin = await prisma.user.upsert({
    where: { email: '[email protected]' },
    update: {},
    create: {
      email: '[email protected]',
      username: 'superadmin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      isVerified: true,
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Admin',
          bio: 'Platform Super Administrator',
          profileCompletionPercentage: 100,
        },
      },
    },
  });

  // Test Host
  const host = await prisma.user.upsert({
    where: { email: '[email protected]' },
    update: {},
    create: {
      email: '[email protected]',
      username: 'testhost',
      password: hashedPassword,
      role: 'HOST',
      status: 'ACTIVE',
      emailVerified: true,
      isVerified: true,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'Host',
          bio: 'Professional event organizer',
          profileCompletionPercentage: 90,
        },
      },
    },
  });

  // Test User
  const user = await prisma.user.upsert({
    where: { email: '[email protected]' },
    update: {},
    create: {
      email: '[email protected]',
      username: 'testuser',
      password: hashedPassword,
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      isVerified: true,
      profile: {
        create: {
          firstName: 'Test',
          lastName: 'User',
          bio: 'Event enthusiast',
          profileCompletionPercentage: 85,
        },
      },
    },
  });

  console.log('✅ Created 3 test users');
  console.log('📧 Login Credentials:');
  console.log('   Super Admin: [email protected] / Admin@12345');
  console.log('   Host: [email protected] / Admin@12345');
  console.log('   User: [email protected] / Admin@12345');
}

async function seedSystemSettings() {
  console.log('⚙️ Seeding system settings...');

  const initialSettings = [
    // ============================================
    // PAYMENT SETTINGS
    // ============================================
    {
      key: 'PLATFORM_FEE_PERCENTAGE',
      value: '5',
      valueType: 'NUMBER',
      category: 'PAYMENT',
      description: 'Platform commission percentage on bookings',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'MIN_BOOKING_AMOUNT',
      value: '100',
      valueType: 'NUMBER',
      category: 'PAYMENT',
      description: 'Minimum booking amount in BDT',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'MAX_BOOKING_AMOUNT',
      value: '50000',
      valueType: 'NUMBER',
      category: 'PAYMENT',
      description: 'Maximum booking amount in BDT',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'REFUND_DEADLINE_DAYS',
      value: '7',
      valueType: 'NUMBER',
      category: 'PAYMENT',
      description: 'Days before event to request refund',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'AUTO_REFUND_ENABLED',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'PAYMENT',
      description: 'Enable automatic refund processing',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'PAYMENT_GATEWAY',
      value: 'STRIPE',
      valueType: 'STRING',
      category: 'PAYMENT',
      description: 'Active payment gateway (STRIPE, BKASH, NAGAD)',
      isPublic: false,
      isEditable: true,
    },

    // ============================================
    // FEATURE FLAGS
    // ============================================
    {
      key: 'ENABLE_SOCIAL_LOGIN',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'FEATURE_FLAGS',
      description: 'Enable Google/Facebook login',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'ENABLE_CHAT',
      value: 'false',
      valueType: 'BOOLEAN',
      category: 'FEATURE_FLAGS',
      description: 'Enable chat feature between users/hosts',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'ENABLE_WISHLISTS',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'FEATURE_FLAGS',
      description: 'Enable event wishlist feature',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'ENABLE_REVIEWS',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'FEATURE_FLAGS',
      description: 'Enable event review/rating feature',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'MAINTENANCE_MODE',
      value: 'false',
      valueType: 'BOOLEAN',
      category: 'FEATURE_FLAGS',
      description: 'Put platform in maintenance mode',
      isPublic: true,
      isEditable: true,
    },

    // ============================================
    // BUSINESS RULES
    // ============================================
    {
      key: 'MAX_EVENTS_PER_HOST',
      value: '10',
      valueType: 'NUMBER',
      category: 'BUSINESS_RULES',
      description: 'Maximum events a host can create (free plan)',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'MAX_ATTENDEES_PER_EVENT',
      value: '500',
      valueType: 'NUMBER',
      category: 'BUSINESS_RULES',
      description: 'Maximum attendees per event',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'EVENT_APPROVAL_REQUIRED',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'BUSINESS_RULES',
      description: 'Require admin approval for new events',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'AUTO_APPROVE_VERIFIED_HOSTS',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'BUSINESS_RULES',
      description: 'Auto-approve events from verified hosts',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'FEATURED_EVENT_PRICE',
      value: '500',
      valueType: 'NUMBER',
      category: 'BUSINESS_RULES',
      description: 'Price to feature an event (BDT)',
      isPublic: true,
      isEditable: true,
    },

    // ============================================
    // EMAIL SETTINGS
    // ============================================
    {
      key: 'SUPPORT_EMAIL',
      value: 'support@ask2buy.com',
      valueType: 'STRING',
      category: 'EMAIL',
      description: 'Support email address',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'NOTIFICATION_EMAIL_ENABLED',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'EMAIL',
      description: 'Enable email notifications',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'EMAIL_SIGNATURE',
      value: 'Best regards,\\nThe Ask2Buy Team',
      valueType: 'STRING',
      category: 'EMAIL',
      description: 'Default email signature',
      isPublic: false,
      isEditable: true,
    },

    // ============================================
    // GENERAL SETTINGS (Public)
    // ============================================
    {
      key: 'APP_NAME',
      value: 'Ask2Buy',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Application name',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'CONTACT_PHONE',
      value: '+880123456789',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Contact phone number',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'CONTACT_EMAIL',
      value: 'hello@ask2buy.com',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Contact email address',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'FACEBOOK_URL',
      value: 'https://facebook.com/ask2buy',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Facebook page URL',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'TWITTER_URL',
      value: 'https://twitter.com/ask2buy',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Twitter profile URL',
      isPublic: true,
      isEditable: true,
    },
    {
      key: 'TERMS_URL',
      value: 'https://ask2buy.com/terms',
      valueType: 'STRING',
      category: 'GENERAL',
      description: 'Terms and conditions URL',
      isPublic: true,
      isEditable: true,
    },

    // ============================================
    // NOTIFICATION SETTINGS
    // ============================================
    {
      key: 'SMS_NOTIFICATION_ENABLED',
      value: 'false',
      valueType: 'BOOLEAN',
      category: 'NOTIFICATION',
      description: 'Enable SMS notifications',
      isPublic: false,
      isEditable: true,
    },
    {
      key: 'PUSH_NOTIFICATION_ENABLED',
      value: 'true',
      valueType: 'BOOLEAN',
      category: 'NOTIFICATION',
      description: 'Enable push notifications',
      isPublic: false,
      isEditable: true,
    },
  ];

  for (const setting of initialSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        // Update only metadata, preserve customized values
        description: setting.description,
        isPublic: setting.isPublic,
      },
      create: setting,
    });
  }

  console.log(`✅ Created ${initialSettings.length} system settings`);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await seedPermissions();
    await seedEventCategories();
    await seedInterests();
    await seedUsers();
    await seedSystemSettings();

    console.log('\n✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
