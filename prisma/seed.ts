import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

async function main() {
  console.log("🌱 Seeding admin user...");

  // Create admin user directly via Prisma (avoids importing browser auth client)
  const adminId = uuid();
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      id: adminId,
      name: "Admin",
      email: "admin@admin.com",
      emailVerified: false,
      role: "admin",
    },
  });

  await prisma.account.create({
    data: {
      id: uuid(),
      userId: adminId,
      accountId: adminId,
      providerId: "credential",
      password: adminPassword,
    },
  });

  // Create regular user
  const userId = uuid();
  const userPassword = await bcrypt.hash("user1234", 10);

  await prisma.user.create({
    data: {
      id: userId,
      name: "User",
      email: "user@user.com",
      emailVerified: false,
      role: "user",
    },
  });

  await prisma.account.create({
    data: {
      id: uuid(),
      userId: userId,
      accountId: userId,
      providerId: "credential",
      password: userPassword,
    },
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
  await prisma.eventSpace.create({
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

  await prisma.eventSpace.create({
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

  await prisma.eventSpace.create({
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

  await prisma.eventSpace.create({
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

  await prisma.eventSpace.create({
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

  await prisma.eventSpace.create({
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
