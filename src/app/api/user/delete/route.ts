import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;

    try {
      // Use admin client to delete the user
      const adminClient = supabaseAdmin;

      // Delete the user using admin API
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(
        userId
      );

      if (deleteError) {
        console.error("Admin delete user error:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete user account" },
          { status: 500 }
        );
      }

      // If you have user data in your database, delete it here
      // Example:
      // await adminClient.from('user_profiles').delete().eq('user_id', userId);
      // await adminClient.from('user_preferences').delete().eq('user_id', userId);

      return NextResponse.json(
        { message: "Account deleted successfully" },
        { status: 200 }
      );
    } catch (adminError) {
      console.error("Admin client error:", adminError);

      // Fallback: Sign out the user and provide instructions
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        return NextResponse.json(
          { error: "Failed to process account deletion" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          message:
            "Account session terminated. Please contact support to complete account deletion.",
          requiresSupport: true,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
