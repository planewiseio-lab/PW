import { supabaseAdmin } from "@/lib/supabase/admin";

async function makeUserAdmin(email: string) {
  try {
    console.log(`🔍 Recherche de l'utilisateur avec l'email: ${email}`);

    // Trouver l'utilisateur par email
    const { data: users, error: searchError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (searchError) {
      console.error("❌ Erreur lors de la recherche:", searchError);
      return;
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      console.error(`❌ Utilisateur avec l'email ${email} non trouvé`);
      console.log("📋 Utilisateurs disponibles:");
      users.users.forEach((u) => console.log(`  - ${u.email} (ID: ${u.id})`));
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    console.log(`📊 Métadonnées actuelles:`, user.user_metadata);

    // Mettre à jour les métadonnées pour ajouter le rôle admin
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          role: "admin",
        },
      }
    );

    if (error) {
      console.error("❌ Erreur lors de la mise à jour:", error);
      return;
    }

    console.log("✅ Utilisateur mis à jour avec succès!");
    console.log("📊 Nouvelles métadonnées:", data.user?.user_metadata);
    console.log(`🎉 ${email} est maintenant administrateur!`);
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log("📝 Usage: npm run make-admin <email>");
    console.log("📝 Exemple: npm run make-admin your-email@example.com");
    return;
  }

  await makeUserAdmin(email);
}

main().catch(console.error);
