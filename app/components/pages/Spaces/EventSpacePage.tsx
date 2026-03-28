"use client";

import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
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
import { cn, fileToBase64, validateFile } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Info,
  MapPin,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createBooking } from "../Booking/BookingActions";
import { getEventSpaceById } from "./EventSpaceActions";
import EventSpaceSkeleton from "./EventSpaceSkeleton";
import { EventSpaceData } from "./schema";

const EventSpacePage = ({ id }: { id: string }) => {
  const [loading, setLoading] = useState(true);
  const [eventSpace, setEventSpace] = useState<EventSpaceData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>();
  const [endTime, setEndTime] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const statusPopup = usePopup();
  const router = useRouter();

  useEffect(() => {
    const fetchEventSpace = async () => {
      setLoading(true);
      const result = await getEventSpaceById(id);
      if (!result.success) {
        statusPopup.showError(result.message || "Failed to fetch event space.");
        setLoading(false);
        return;
      }

      setEventSpace(result.data || null);
      setLoading(false);
    };

    fetchEventSpace();
  }, [id]);

  // Calculate total price based on selected times
  const { hours, totalPrice } = useMemo(() => {
    if (!startTime || !endTime || !eventSpace) {
      return { hours: 0, totalPrice: 0 };
    }

    const [startHour] = startTime.split(":").map(Number);
    const [endHour] = endTime.split(":").map(Number);
    const calculatedHours = endHour - startHour;

    if (calculatedHours <= 0) {
      return { hours: 0, totalPrice: 0 };
    }

    return {
      hours: calculatedHours,
      totalPrice: calculatedHours * eventSpace.pricePerHour,
    };
  }, [startTime, endTime, eventSpace]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      statusPopup.showError(validation.error || "Invalid file");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById(
      "requirements-file",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDate || !startTime || !endTime || !eventSpace) {
      statusPopup.showError("Please fill in all required fields.");
      return;
    }

    if (hours <= 0) {
      statusPopup.showError("End time must be after start time.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("eventSpaceId", eventSpace.id);
    formData.append("date", format(selectedDate, "yyyy-MM-dd"));
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);

    // Handle file upload if present
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (validation.valid && validation.fileType) {
        try {
          const base64 = await fileToBase64(selectedFile);
          formData.append("requirementsFile", base64);
          formData.append("requirementsFileType", validation.fileType);
        } catch (error) {
          statusPopup.showError("Failed to process file");
          setIsSubmitting(false);
          return;
        }
      }
    }

    const confirmed = await statusPopup.showYesNo(
      `Confirm booking for ${eventSpace.name} on ${format(
        selectedDate,
        "PPP",
      )} from ${startTime} to ${endTime}?`,
    );

    if (!confirmed) return;

    statusPopup.showLoading("Submitting booking request...");
    setIsSubmitting(true);

    try {
      const result = await createBooking(formData);

      if (!result.success) {
        statusPopup.showError(result.message || "Failed to create booking.");
        return;
      }

      statusPopup.showSuccess(
        "Booking request submitted successfully. Awaiting admin approval.",
      );

      // Reset form
      setSelectedDate(undefined);
      setStartTime(undefined);
      setEndTime(undefined);
      setSelectedFile(null);
      const fileInput = document.getElementById(
        "requirements-file",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      statusPopup.showError(
        (error as Error).message || "Failed to create booking.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <EventSpaceSkeleton />;
  if (!eventSpace)
    return (
      <ErrorPopup
        message="Event space not found."
        onClose={() => router.back()}
      />
    );

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="h-64 lg:h-96 bg-linear-to-br from-sky-100 to-emerald-100 rounded-2xl overflow-hidden shadow-lg relative">
          {eventSpace.image ? (
            <Image
              src={`data:image/jpeg;base64,${Buffer.from(
                eventSpace.image,
              ).toString("base64")}`}
              alt={eventSpace.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-32 h-32 text-gray-400" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
                eventSpace.status === "ACTIVE"
                  ? "bg-emerald-500 text-white"
                  : eventSpace.status === "UNDER_MAINTENANCE"
                    ? "bg-amber-500 text-white"
                    : eventSpace.status === "BOOKED"
                      ? "bg-red-500 text-white"
                      : "bg-gray-500 text-white"
              }`}
            >
              {eventSpace.status === "ACTIVE"
                ? "Active"
                : eventSpace.status === "UNDER_MAINTENANCE"
                  ? "Under Maintenance"
                  : eventSpace.status === "BOOKED"
                    ? "Booked"
                    : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description */}
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              {eventSpace.name}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {eventSpace.description}
            </p>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">{eventSpace.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacity</p>
                    <p className="font-semibold">
                      {eventSpace.capacity} people
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-semibold">
                      {eventSpace.pricePerHour === 0
                        ? "Free"
                        : `₱${eventSpace.pricePerHour}/hr`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amenities Section */}
          {eventSpace.amenities && eventSpace.amenities.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Amenities
                </CardTitle>
                <CardDescription>
                  Available facilities and equipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {eventSpace.amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-2xl">{amenity.icon}</span>
                      <span className="font-medium text-gray-700">
                        {amenity.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Total Bookings</span>
                <span className="font-semibold">
                  {eventSpace.totalBookings} bookings
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Created</span>
                <span className="font-semibold">
                  {new Date(eventSpace.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-semibold">
                  {new Date(eventSpace.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Booking Form */}
        <div className="lg:col-span-1">
          <Card className="border-2 sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Book This Space
              </CardTitle>
              <CardDescription>
                {eventSpace.status === "ACTIVE"
                  ? "Fill in the details to make a reservation"
                  : "Booking is currently unavailable"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventSpace.status === "ACTIVE" ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i).map(
                            (hour) => (
                              <SelectItem
                                key={hour}
                                value={`${hour.toString().padStart(2, "0")}:00`}
                              >
                                {`${hour.toString().padStart(2, "0")}:00`}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Select value={endTime} onValueChange={setEndTime}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i).map(
                            (hour) => (
                              <SelectItem
                                key={hour}
                                value={`${hour.toString().padStart(2, "0")}:00`}
                              >
                                {`${hour.toString().padStart(2, "0")}:00`}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attendees">Number of Attendees</Label>
                    <Input
                      id="attendees"
                      name="attendees"
                      type="number"
                      min="1"
                      max={eventSpace.capacity}
                      placeholder={`Max ${eventSpace.capacity}`}
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      name="purpose"
                      placeholder="Brief description of your event..."
                      rows={4}
                      className="resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements-file">
                      Requirements Document (Optional)
                    </Label>
                    <div className="space-y-2">
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          selectedFile
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-300 hover:border-sky-400"
                        }`}
                      >
                        <input
                          id="requirements-file"
                          type="file"
                          accept=".pdf,.docx,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {!selectedFile ? (
                          <label
                            htmlFor="requirements-file"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="w-8 h-8 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Click to upload
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PDF, DOCX, or Images (Max 5MB)
                              </p>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6 text-emerald-600" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">
                                  {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Price per hour</span>
                      <span className="font-semibold">
                        {eventSpace.pricePerHour === 0
                          ? "Free"
                          : `₱${eventSpace.pricePerHour}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-semibold">
                        {hours > 0
                          ? `${hours} hour${hours > 1 ? "s" : ""}`
                          : "--"}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold text-emerald-600">
                          {eventSpace.pricePerHour === 0
                            ? "Free"
                            : hours > 0
                              ? `₱${totalPrice.toFixed(2)}`
                              : "₱--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedDate ||
                      !startTime ||
                      !endTime ||
                      hours <= 0
                    }
                    className="w-full h-12 bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Request Booking"}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Your booking request will be reviewed by administrators
                  </p>
                </form>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">
                    This space is currently unavailable
                  </p>
                  <p className="text-sm text-gray-500">
                    {eventSpace.status === "UNDER_MAINTENANCE"
                      ? "Under maintenance"
                      : eventSpace.status === "BOOKED"
                        ? "Currently booked"
                        : "Inactive"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="px-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Spaces
        </Button>
      </div>
    </div>
  );
};

export default EventSpacePage;
