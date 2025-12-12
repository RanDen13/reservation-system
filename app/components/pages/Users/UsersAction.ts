"use server";

import ActionResult from "@/app/components/ActionResult";
import { User } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function getAllUsers(): Promise<ActionResult<User[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Only admins can view all users.",
      };
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch users.",
    };
  }
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Only admins can update user roles.",
      };
    }

    // Prevent admin from changing their own role
    if (session.user.id === userId) {
      return {
        success: false,
        message: "You cannot change your own role.",
      };
    }

    if (role !== "admin" && role !== "user") {
      return {
        success: false,
        message: "Invalid role specified.",
      };
    }

    await auth.api.setRole({
      body: {
        userId: userId,
        role: role, // required
      },
      headers: await headers(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update user role.",
    };
  }
}

export async function banUser(
  userId: string,
  banReason?: string
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Only admins can ban users.",
      };
    }

    // Prevent admin from banning themselves
    if (session.user.id === userId) {
      return {
        success: false,
        message: "You cannot ban yourself.",
      };
    }

    await auth.api.banUser({
      body: {
        userId: userId, // required
        banReason: banReason || "No reason provided",
      },
      // This endpoint requires session cookies.
      headers: await headers(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error banning user:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to ban user.",
    };
  }
}

export async function unbanUser(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Only admins can unban users.",
      };
    }

    await auth.api.unbanUser({
      body: {
        userId,
      },
      headers: await headers(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error unbanning user:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to unban user.",
    };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Only admins can delete users.",
      };
    }

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return {
        success: false,
        message: "You cannot delete yourself.",
      };
    }

    // Delete user (sessions and accounts will cascade delete)
    await auth.api.removeUser({
      body: {
        userId,
      },
      headers: await headers(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to delete user.",
    };
  }
}
