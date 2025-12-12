"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { User } from "@/generated/prisma/browser";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle,
  Filter,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { banUser, deleteUser, unbanUser, updateUserRole } from "./UsersAction";

interface UsersPageProps {
  users: User[];
}

const UsersPage = ({ users }: UsersPageProps) => {
  const session = useSession();
  const currentUserId = session.data?.user?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [banReason, setBanReason] = useState("");
  const statusPopup = usePopup();
  const router = useRouter();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "BANNED" && user.banned) ||
      (statusFilter === "ACTIVE" && !user.banned);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    regular: users.filter((u) => u.role === "user" || !u.role).length,
    banned: users.filter((u) => u.banned).length,
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to change ${selectedUser.name}'s role to "${newRole}"?`
    );

    if (!confirmed) return;

    statusPopup.showLoading("Updating user role...");

    const result = await updateUserRole(selectedUser.id, newRole);

    if (!result.success) {
      statusPopup.showError(result.message || "Failed to update user role.");
      return;
    }

    statusPopup.showSuccess("User role updated successfully.");
    setShowRoleModal(false);
    setSelectedUser(null);
    setNewRole("");
    router.refresh();
  };

  const handleBanToggle = async (user: User) => {
    if (user.banned) {
      // Unban user
      const confirmed = await statusPopup.showYesNo(
        `Are you sure you want to unban ${user.name}?`
      );

      if (!confirmed) return;

      statusPopup.showLoading("Unbanning user...");

      const result = await unbanUser(user.id);

      if (!result.success) {
        statusPopup.showError(result.message || "Failed to unban user.");
        return;
      }

      statusPopup.showSuccess("User unbanned successfully.");
      router.refresh();
    } else {
      // Ban user - show modal for reason
      setSelectedUser(user);
      setShowBanModal(true);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to ban ${selectedUser.name}? This will revoke all their active sessions.`
    );

    if (!confirmed) return;

    statusPopup.showLoading("Banning user...");

    const result = await banUser(selectedUser.id, banReason);

    if (!result.success) {
      statusPopup.showError(result.message || "Failed to ban user.");
      return;
    }

    statusPopup.showSuccess("User banned successfully.");
    setShowBanModal(false);
    setSelectedUser(null);
    setBanReason("");
    router.refresh();
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = await statusPopup.showWarning(
      `Are you sure you want to permanently delete ${user.name}? This action cannot be undone and will remove all their data.`
    );

    if (!confirmed) return;

    statusPopup.showLoading("Deleting user...");

    const result = await deleteUser(user.id);

    if (!result.success) {
      statusPopup.showError(result.message || "Failed to delete user.");
      return;
    }

    statusPopup.showSuccess("User deleted successfully.");
    router.refresh();
  };

  const getRoleBadge = (role: string | null) => {
    if (role === "admin") {
      return (
        <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
        <UserCheck className="w-3 h-3" />
        User
      </Badge>
    );
  };

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage user roles, permissions, and account status
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.admins}</h3>
                <p className="text-sm text-gray-600">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.regular}</h3>
                <p className="text-sm text-gray-600">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.banned}</h3>
                <p className="text-sm text-gray-600">Banned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter
            </CardTitle>
            <CardDescription>Find specific users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Name or email"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger id="role" className="h-12">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="h-12">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{filteredUsers.length}</span>{" "}
          of {users.length} users
        </p>
      </div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        {filteredUsers.map((user, index) => {
          const isCurrentUser = user.id === currentUserId;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-800">
                              {user.name}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-blue-100 text-blue-700">
                                You
                              </Badge>
                            )}
                            {getRoleBadge(user.role)}
                            {user.banned && (
                              <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                Banned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                            {user.emailVerified && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </div>

                      {user.banned && user.banReason && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-sm text-red-700">
                            <span className="font-semibold">Ban Reason:</span>{" "}
                            {user.banReason}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Right Section - Actions */}
                    {!isCurrentUser && (
                      <div className="flex flex-col gap-3 lg:min-w-[200px]">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={`ban-${user.id}`} className="text-sm">
                            {user.banned ? "Unban" : "Ban"}
                          </Label>
                          <Switch
                            id={`ban-${user.id}`}
                            checked={user.banned || false}
                            onCheckedChange={() => handleBanToggle(user)}
                          />
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role || "user");
                            setShowRoleModal(true);
                          }}
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          Change Role
                        </Button>

                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* No Results */}
      {filteredUsers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No users found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search filters to find more results
          </p>
        </motion.div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <ModalBase onClose={() => setShowRoleModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                Change User Role
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">User</p>
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newRole">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="newRole" className="h-12">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        User
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRoleChange}
                className="bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
              >
                Update Role
              </Button>
            </div>
          </div>
        </ModalBase>
      )}

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <ModalBase onClose={() => setShowBanModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" />
                Ban User
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">User</p>
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banReason">Ban Reason</Label>
                <Textarea
                  id="banReason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Banning this user will immediately
                  revoke all their active sessions and prevent them from signing
                  in.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowBanModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBanUser}
                className="bg-red-600 hover:bg-red-700"
              >
                <Ban className="w-4 h-4 mr-2" />
                Ban User
              </Button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
};

export default UsersPage;
