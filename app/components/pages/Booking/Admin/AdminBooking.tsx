"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Calendar as CalendarComponent } from "@/app/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { BookingStatus } from "@/generated/prisma/enums";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Search,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllBookings, updateBookingStatus } from "../BookingActions";
import FileViewerModal from "../FileViewerModal";
import { BookingData } from "../schema";

const AdminBooking = () => {
  const router = useRouter();
  const statusPopup = usePopup();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [fileViewer, setFileViewer] = useState<{
    fileData: Buffer;
    fileType: "PDF" | "DOCX" | "IMAGE";
    bookingId: string;
  } | null>(null);

  const handleViewFile = (
    fileData: Buffer,
    fileType: "PDF" | "DOCX" | "IMAGE",
    bookingId: string,
  ) => {
    setFileViewer({ fileData, fileType, bookingId });
  };

  const handleDownloadFile = (
    fileData: Buffer,
    fileType: "PDF" | "DOCX" | "IMAGE",
    bookingId: string,
  ) => {
    try {
      const byteArray = new Uint8Array(Object.values(fileData));
      const blob = new Blob([byteArray], {
        type:
          fileType === "PDF"
            ? "application/pdf"
            : fileType === "DOCX"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "image/jpeg",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension =
        fileType === "PDF" ? ".pdf" : fileType === "DOCX" ? ".docx" : ".jpg";
      a.download = `booking-${bookingId}-requirements${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      statusPopup.showError("Failed to download file");
      console.error("Download error:", error);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const result = await getAllBookings();
      if (result.success && result.data) {
        setBookings(result.data);
      } else {
        statusPopup.showError(result.message || "Failed to fetch bookings");
      }
    } catch (error) {
      statusPopup.showError("An error occurred while fetching bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    spaceName: string,
  ) => {
    if (newStatus === "REJECTED") {
      setSelectedBooking({ id: bookingId, name: spaceName });
      setShowRejectModal(true);
      return;
    }

    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to ${newStatus.toLowerCase()} the booking for ${spaceName}?`,
    );
    if (!confirmed) return;

    await updateStatus(bookingId, newStatus);
  };

  const handleRejectWithReason = async () => {
    if (!selectedBooking || !rejectionReason.trim()) {
      statusPopup.showError("Please provide a rejection reason");
      return;
    }

    setShowRejectModal(false);
    await updateStatus(selectedBooking.id, "REJECTED", rejectionReason);
    setRejectionReason("");
    setSelectedBooking(null);
  };

  const updateStatus = async (
    bookingId: string,
    newStatus: BookingStatus,
    reason?: string,
  ) => {
    statusPopup.showLoading(`Updating booking status...`);
    const formData = new FormData();
    formData.append("id", bookingId);
    formData.append("status", newStatus);
    if (newStatus === "REJECTED" && reason) {
      formData.append("rejectionReason", reason);
    }

    const result = await updateBookingStatus(formData);
    if (result.success) {
      statusPopup.showSuccess(result.message || "Booking updated successfully");
      await fetchBookings();
      router.refresh();
    } else {
      statusPopup.showError(result.message || "Failed to update booking");
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      (booking.eventSpace?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (booking.user?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || booking.status === statusFilter;
    const matchesDate = dateFilter
      ? format(new Date(booking.date), "yyyy-MM-dd") ===
        format(dateFilter, "yyyy-MM-dd")
      : true;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    approved: bookings.filter((b) => b.status === "APPROVED").length,
    rejected: bookings.filter((b) => b.status === "REJECTED").length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
  };

  const getStatusBadge = (status: BookingStatus) => {
    const variants = {
      PENDING: { color: "bg-amber-100 text-amber-700", icon: Clock },
      APPROVED: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      REJECTED: { color: "bg-red-100 text-red-700", icon: XCircle },
      COMPLETED: { color: "bg-blue-100 text-blue-700", icon: CalendarCheck },
      CANCELLED: { color: "bg-gray-100 text-gray-700", icon: XCircle },
    };

    const { color, icon: Icon } = variants[status];

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
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
          Manage Bookings
        </h1>
        <p className="text-gray-600 mt-2">
          Review and manage all event space reservations
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-4"
      >
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.pending}</h3>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.approved}</h3>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-red-500 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.rejected}</h3>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.completed}</h3>
                <p className="text-sm text-gray-600">Completed</p>
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
            <CardDescription>Find specific bookings</CardDescription>
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
                    placeholder="Space or user name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="h-12">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilter ? format(dateFilter, "PPP") : "All dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                    />
                    {dateFilter && (
                      <div className="p-3 border-t">
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => setDateFilter(undefined)}
                        >
                          Clear filter
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Showing{" "}
            <span className="font-semibold">{filteredBookings.length}</span> of{" "}
            {bookings.length} bookings
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
          <p className="text-gray-600">Loading bookings...</p>
        </motion.div>
      ) : (
        <>
          {/* Bookings List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card className="border-2 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Section */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-gray-800">
                                {booking.eventSpace?.name || "Unknown Space"}
                              </h3>
                              {booking.requirementsData &&
                                booking.requirementsDataType && (
                                  <Paperclip className="w-4 h-4 text-blue-600" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              {booking.eventSpace?.location ||
                                "Unknown Location"}
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {booking.user?.name || "Unknown"}
                            </span>
                            <span className="text-gray-500">
                              ({booking.user?.email || "No email"})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{booking.attendees} attendees</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(new Date(booking.date), "PPP")}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>
                              {booking.startTime} - {booking.endTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold">
                              ₱{booking.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Purpose:</span>{" "}
                            {booking.purpose}
                          </p>
                        </div>

                        {booking.requirementsData &&
                          booking.requirementsDataType && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {booking.requirementsDataType === "IMAGE" ? (
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-blue-600" />
                                  )}
                                  <div>
                                    <p className="text-sm font-semibold text-blue-900">
                                      Requirements Document
                                    </p>
                                    <p className="text-xs text-blue-700">
                                      {booking.requirementsDataType} file
                                      attached
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {booking.requirementsDataType === "DOCX" ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleDownloadFile(
                                          Buffer.from(
                                            booking.requirementsData!,
                                          ),
                                          booking.requirementsDataType!,
                                          booking.id,
                                        )
                                      }
                                      className="shrink-0 border-blue-300 hover:bg-blue-100"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleViewFile(
                                            Buffer.from(
                                              booking.requirementsData!,
                                            ),
                                            booking.requirementsDataType!,
                                            booking.id,
                                          )
                                        }
                                        className="shrink-0 border-blue-300 hover:bg-blue-100"
                                      >
                                        <FileText className="w-4 h-4 mr-2" />
                                        View
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleDownloadFile(
                                            Buffer.from(
                                              booking.requirementsData!,
                                            ),
                                            booking.requirementsDataType!,
                                            booking.id,
                                          )
                                        }
                                        className="shrink-0 border-blue-300 hover:bg-blue-100"
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        {booking.rejectionReason && (
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-sm text-red-600">
                              <span className="font-semibold">
                                Rejection Reason:
                              </span>{" "}
                              {booking.rejectionReason}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-gray-500">
                          Requested on:{" "}
                          {format(new Date(booking.createdAt), "PPP")}
                        </p>
                      </div>

                      {/* Right Section - Actions */}
                      {booking.status === "PENDING" && (
                        <div className="flex lg:flex-col gap-2">
                          <Button
                            onClick={() =>
                              handleUpdateStatus(
                                booking.id,
                                "APPROVED",
                                booking.eventSpace?.name || "this space",
                              )
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 flex-1 lg:flex-none"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() =>
                              handleUpdateStatus(
                                booking.id,
                                "REJECTED",
                                booking.eventSpace?.name || "this space",
                              )
                            }
                            variant="destructive"
                            className="flex-1 lg:flex-none"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {booking.status === "APPROVED" && (
                        <Button
                          onClick={() =>
                            handleUpdateStatus(
                              booking.id,
                              "COMPLETED",
                              booking.eventSpace?.name || "this space",
                            )
                          }
                          variant="outline"
                          className="lg:w-32"
                        >
                          <CalendarCheck className="w-4 h-4 mr-2" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* No Results */}
          {filteredBookings.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <CalendarX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No bookings found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search filters to find more results
              </p>
            </motion.div>
          )}
        </>
      )}

      {/* Reject Booking Modal */}
      {showRejectModal && (
        <ModalBase
          onClose={() => {
            setShowRejectModal(false);
            setRejectionReason("");
            setSelectedBooking(null);
          }}
        >
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Reject Booking</CardTitle>
              <CardDescription>
                Please provide a reason for rejecting this booking for{" "}
                {selectedBooking?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                    setSelectedBooking(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectWithReason}
                  disabled={!rejectionReason.trim()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModalBase>
      )}

      {/* File Viewer Modal */}
      {fileViewer && (
        <FileViewerModal
          fileData={fileViewer.fileData}
          fileType={fileViewer.fileType}
          bookingId={fileViewer.bookingId}
          onClose={() => setFileViewer(null)}
        />
      )}
    </div>
  );
};

export default AdminBooking;
