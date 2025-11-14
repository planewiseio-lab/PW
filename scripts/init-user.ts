import { prisma } from "../src/lib/prisma";

async function initializeUser(userId: string) {
  console.log(`🔄 Initializing user: ${userId}`);

  try {
    // Vérifier si l'utilisateur existe déjà dans user_subscriptions
    const existingSubscription = await prisma.user_subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (existingSubscription) {
      console.log(
        `⏭️ User ${userId} already has subscription (${existingSubscription.plan})`
      );
      return { success: false, message: "User already exists" };
    }

    // Créer une subscription FREE par défaut
    const subscription = await prisma.user_subscriptions.create({
      data: {
        user_id: userId,
        plan: "free",
        status: "active",
      },
    });

    console.log(`✅ Created subscription for user ${userId}`);
    console.log(`   Plan: ${subscription.plan}`);
    console.log(`   Status: ${subscription.status}`);

    return { success: true, message: "User initialized successfully" };
  } catch (error) {
    console.error(`❌ Error initializing user ${userId}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.log("📝 Usage: npm run init-user <userId>");
    console.log(
      "📝 Exemple: npm run init-user 38fc6fe6-e3b2-406d-b5db-a8a68e6b3242"
    );
    return;
  }

  const result = await initializeUser(userId);

  if (result.success) {
    console.log("🎉 User initialized successfully!");
  } else {
    console.log("❌ Failed to initialize user:", result.message);
  }
}

main().catch(console.error);
