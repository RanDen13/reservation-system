import { signUp } from "@/lib/auth-client";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🌱 Seeding admin user...");

  await signUp.email(
    {
      email: "admin@admin.com", // user email address
      password: "admin123", // user password -> min 8 characters by default
      name: "Admin", // user display name
    },
    {
      onError: (ctx) => {
        console.error(`Failed to create admin user: ${ctx.error.message}`);
      },
    }
  );

  await signUp.email(
    {
      email: "user@user.com", // user email address
      password: "user1234", // user password -> min 8 characters by default
      name: "User", // user display name
    },
    {
      onError: (ctx) => {
        console.error(`Failed to create user: ${ctx.error.message}`);
      },
    }
  );

  await prisma.user.update({
    where: { email: "admin@admin.com" },
    data: { role: "admin" },
  });

  console.log("🌱 Seeding amenities...");

  // Create amenities first
  const wifi = await prisma.amenity.create({
    data: { id: "a1", name: "WiFi", icon: "📶" },
  });

  const projector = await prisma.amenity.create({
    data: { id: "a2", name: "Projector", icon: "📽️" },
  });

  const whiteboard = await prisma.amenity.create({
    data: { id: "a3", name: "Whiteboard", icon: "🖊️" },
  });

  const videoConferencing = await prisma.amenity.create({
    data: { id: "a4", name: "Video Conferencing", icon: "📹" },
  });

  const soundSystem = await prisma.amenity.create({
    data: { id: "a5", name: "Sound System", icon: "🔊" },
  });

  const stage = await prisma.amenity.create({
    data: { id: "a6", name: "Stage", icon: "🎭" },
  });

  const airConditioning = await prisma.amenity.create({
    data: { id: "a7", name: "Air Conditioning", icon: "❄️" },
  });

  const tvDisplay = await prisma.amenity.create({
    data: { id: "a8", name: "TV Display", icon: "📺" },
  });

  const computers = await prisma.amenity.create({
    data: { id: "a9", name: "Computers", icon: "💻" },
  });

  const coffeeMachine = await prisma.amenity.create({
    data: { id: "a10", name: "Coffee Machine", icon: "☕" },
  });

  const sofas = await prisma.amenity.create({
    data: { id: "a11", name: "Sofas", icon: "🛋️" },
  });

  const podium = await prisma.amenity.create({
    data: { id: "a12", name: "Podium", icon: "🎤" },
  });

  console.log("🌱 Seeding event spaces...");

  // Create event spaces and link to existing amenities
  const space1 = await prisma.eventSpace.create({
    data: {
      id: "1",
      name: "Conference Room A",
      capacity: 20,
      location: "Building A, 2nd Floor",
      description:
        "Modern conference room with video conferencing capabilities",
      status: "ACTIVE",
      pricePerHour: 0,
      totalBookings: 45,
      amenities: {
        connect: [
          { id: wifi.id },
          { id: projector.id },
          { id: whiteboard.id },
          { id: videoConferencing.id },
        ],
      },
    },
  });

  const space2 = await prisma.eventSpace.create({
    data: {
      id: "2",
      name: "Main Auditorium",
      capacity: 200,
      location: "Main Building, Ground Floor",
      description: "Large auditorium perfect for seminars and presentations",
      status: "ACTIVE",
      pricePerHour: 0,
      totalBookings: 78,
      amenities: {
        connect: [
          { id: soundSystem.id },
          { id: projector.id },
          { id: stage.id },
          { id: airConditioning.id },
        ],
      },
    },
  });

  const space3 = await prisma.eventSpace.create({
    data: {
      id: "3",
      name: "Meeting Room B",
      capacity: 10,
      location: "Building B, 3rd Floor",
      description: "Intimate meeting space for small group discussions",
      status: "UNDER_MAINTENANCE",
      pricePerHour: 0,
      totalBookings: 32,
      amenities: {
        connect: [{ id: wifi.id }, { id: tvDisplay.id }, { id: whiteboard.id }],
      },
    },
  });

  const space4 = await prisma.eventSpace.create({
    data: {
      id: "4",
      name: "Computer Laboratory 1",
      capacity: 40,
      location: "IT Building, 1st Floor",
      description: "Fully equipped computer lab with modern workstations",
      status: "ACTIVE",
      pricePerHour: 0,
      totalBookings: 56,
      amenities: {
        connect: [
          { id: wifi.id },
          { id: computers.id },
          { id: projector.id },
          { id: airConditioning.id },
        ],
      },
    },
  });

  const space5 = await prisma.eventSpace.create({
    data: {
      id: "5",
      name: "Student Lounge",
      capacity: 30,
      location: "Student Center, 2nd Floor",
      description: "Casual meeting space with comfortable seating",
      status: "ACTIVE",
      pricePerHour: 0,
      totalBookings: 23,
      amenities: {
        connect: [
          { id: wifi.id },
          { id: coffeeMachine.id },
          { id: sofas.id },
          { id: tvDisplay.id },
        ],
      },
    },
  });

  const space6 = await prisma.eventSpace.create({
    data: {
      id: "6",
      name: "Lecture Hall 101",
      capacity: 100,
      location: "Academic Building, 1st Floor",
      description: "Traditional lecture hall with tiered seating",
      status: "ACTIVE",
      pricePerHour: 0,
      totalBookings: 67,
      amenities: {
        connect: [
          { id: projector.id },
          { id: soundSystem.id },
          { id: podium.id },
          { id: airConditioning.id },
        ],
      },
    },
  });

  console.log("✅ Seeding completed successfully!");
  console.log(`- Created 2 users (admin@admin.com, user@user.com)`);
  console.log(`- Created 12 amenities`);
  console.log(`- Created 6 event spaces with linked amenities`);
}

main()
  .catch((err) => {
    console.error("❌ Error during seeding:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
