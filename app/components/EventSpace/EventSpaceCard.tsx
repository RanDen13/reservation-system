"use client";

import { deleteEventSpace } from "@/app/components/pages/Spaces/EventSpaceActions";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Amenity, EventSpace } from "@/generated/prisma/browser";
import { Building2, Calendar, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePopup } from "../Popup/PopupProvider";
import { amenityIcons } from "./AmenityIcon";
import EditEventSpacePopup from "./EditEventSpacePopup";

interface EventAreaProps {
  eventSpace: EventSpace & { amenities?: Amenity[] };
  showAdminActions?: boolean;
  detailsHref?: string;
}

export default function EventSpaceCard({
  eventSpace,
  showAdminActions = false,
  detailsHref,
}: EventAreaProps) {
  const {
    id,
    name,
    description,
    location,
    capacity,
    status,
    pricePerHour,
    amenities = [],
  } = eventSpace;
  const [showEditPopup, setShowEditPopup] = useState<boolean>(false);
  const statusPopup = usePopup();
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to delete the event space "${name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    statusPopup.showLoading("Deleting event space...");
    const result = await deleteEventSpace(id);
    if (!result.success) {
      statusPopup.showError(result.message || "Failed to delete event space.");
      return;
    }
    router.refresh();
    statusPopup.showSuccess("Event space deleted successfully.");
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-xl transition-all h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 bg-linear-to-br from-sky-100 to-emerald-100">
          {eventSpace.image ? (
            <Image
              src={`data:image/jpeg;base64,${Buffer.from(
                eventSpace.image
              ).toString("base64")}`}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                status === "ACTIVE"
                  ? "bg-emerald-500 text-white"
                  : status === "UNDER_MAINTENANCE"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {status === "ACTIVE"
                ? "Active"
                : status === "UNDER_MAINTENANCE"
                ? "Maintenance"
                : "Inactive"}
            </span>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-2">{name}</h3>
            <p className="text-sm text-gray-600 mb-4">{description}</p>

            {/* Location & Capacity */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Capacity: {capacity} people</span>
              </div>
              {showAdminActions && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>Managed by super admin</span>
                </div>
              )}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  AMENITIES
                </p>
                <div className="flex flex-wrap gap-2">
                  {amenities.slice(0, 3).map((amenity) => (
                    <span
                      key={amenity.id}
                      className="px-2 py-1 bg-gray-100 rounded-md text-xs flex items-center gap-1"
                    >
                      {amenityIcons[amenity.name] || (
                        <Building2 className="w-4 h-4" />
                      )}
                      {amenity.name}
                    </span>
                  ))}
                  {amenities.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                      +{amenities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Price */}
            <p className="text-sm font-semibold text-emerald-600 mb-4">
              {pricePerHour === 0
                ? "Free for officers"
                : `₱${pricePerHour.toFixed(2)}/hour`}
            </p>
          </div>

          {/* Actions */}
          {showAdminActions ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setShowEditPopup(true)}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={handleDelete}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          ) : (
            <Link href={detailsHref || `/user/spaces/${id}`} className="block">
              <Button variant="outline" className="w-full cursor-pointer">
                View Details
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
      {showEditPopup && (
        <EditEventSpacePopup
          eventSpace={eventSpace}
          onClose={() => setShowEditPopup(false)}
        />
      )}
    </>
  );
}
