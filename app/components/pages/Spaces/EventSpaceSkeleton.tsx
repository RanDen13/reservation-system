import { Card, CardContent, CardHeader } from "@/app/components/ui/card";

const EventSpaceSkeleton = () => {
  return (
    <div className="p-4 lg:p-8 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-64 lg:h-96 bg-muted/60 rounded-2xl" />

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <div className="h-10 bg-muted/60 rounded-lg w-3/4 mb-4" />
            <div className="h-6 bg-muted/60 rounded-lg w-full mb-2" />
            <div className="h-6 bg-muted/60 rounded-lg w-5/6" />
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted/60 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted/60 rounded w-16 mb-2" />
                      <div className="h-5 bg-muted/60 rounded w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Amenities Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="h-6 bg-muted/60 rounded-lg w-32 mb-2" />
              <div className="h-4 bg-muted/60 rounded-lg w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 bg-muted/60 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="h-6 bg-muted/60 rounded-lg w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/60 rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reservation Form */}
        <div className="lg:col-span-1">
          <Card className="border-2">
            <CardHeader>
              <div className="h-6 bg-muted/60 rounded-lg w-32 mb-2" />
              <div className="h-4 bg-muted/60 rounded-lg w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted/60 rounded-lg" />
              ))}
              <div className="h-32 bg-muted/60 rounded-lg" />
              <div className="h-12 bg-muted/60 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-center">
        <div className="h-10 bg-muted/60 rounded-lg w-40" />
      </div>
    </div>
  );
};

export default EventSpaceSkeleton;
