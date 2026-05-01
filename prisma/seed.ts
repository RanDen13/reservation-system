import { provisionCredentialAccount, type ManagedRole } from "@/lib/account-provisioning";
import { prisma } from "@/lib/prisma";
import { v4 as uuid } from "uuid";

async function createAccount(
  email: string,
  password: string,
  name: string,
  role: ManagedRole,
) {
  return provisionCredentialAccount(
    {
      email,
      password,
      name,
      role,
    },
    {
      allowExisting: true,
      resetPassword: true,
    },
  );
}

async function main() {
  console.log("Seeding officer-only SAPF reservation system...");

  const superAdmin = await createAccount(
    "superadmin@lcup.edu.ph",
    "superadmin123",
    "Super Admin",
    "SUPER_ADMIN",
  );
  await createAccount("officer@lcup.edu.ph", "officer123", "Org Officer", "OFFICER");
  const adviser = await createAccount("adviser@lcup.edu.ph", "adviser123", "Club Adviser", "APPROVER");
  const dean = await createAccount("dean@lcup.edu.ph", "dean12345", "College Dean", "APPROVER");
  const sds = await createAccount("sds@lcup.edu.ph", "sds12345", "SDS Admin", "ADMIN");
  const sas = await createAccount("sas@lcup.edu.ph", "sas12345", "SAS Director", "APPROVER");
  const finance = await createAccount("finance@lcup.edu.ph", "finance123", "VP Finance", "APPROVER");
  const vpaa = await createAccount("vpaa@lcup.edu.ph", "vpaa12345", "VPAA", "APPROVER");
  const president = await createAccount(
    "president@lcup.edu.ph",
    "president123",
    "University President",
    "APPROVER",
  );

  await Promise.all(
    [
      { userId: adviser.id, position: "ADVISER" },
      { userId: dean.id, position: "DEAN" },
      { userId: sds.id, position: "SDS" },
      { userId: sas.id, position: "SAS" },
      { userId: finance.id, position: "ADDITIONAL_SIGNATORY" },
      { userId: vpaa.id, position: "VPAA" },
      { userId: president.id, position: "UNIVERSITY_PRESIDENT" },
    ].map(({ userId, position }) =>
      prisma.approverPositionUser.upsert({
        where: {
          userId_position: {
            userId,
            position: position as any,
          },
        },
        update: {
          active: true,
        },
        create: {
          id: uuid(),
          userId,
          position: position as any,
        },
      }),
    ),
  );

  const amenities = await Promise.all(
    [
      ["a1", "WiFi", "wifi"],
      ["a2", "Projector", "projector"],
      ["a3", "Sound System", "sound"],
      ["a4", "Stage", "stage"],
      ["a5", "Air Conditioning", "air"],
      ["a6", "Chairs and Tables", "chairs"],
    ].map(([id, name, icon]) =>
      prisma.amenity.upsert({
        where: { id },
        update: { name, icon },
        create: { id, name, icon },
      }),
    ),
  );

  const [wifi, projector, sound, stage, air, chairs] = amenities;

  await prisma.eventSpace.upsert({
    where: { id: "venue-auditorium" },
    update: {},
    create: {
      id: "venue-auditorium",
      name: "Main Auditorium",
      capacity: 200,
      location: "Main Building, Ground Floor",
      description: "Large venue for assemblies, seminars, and major programs.",
      status: "ACTIVE",
      pricePerHour: 0,
      amenities: {
        connect: [
          { id: projector.id },
          { id: sound.id },
          { id: stage.id },
          { id: air.id },
          { id: chairs.id },
        ],
      },
    },
  });

  await prisma.eventSpace.upsert({
    where: { id: "venue-gym" },
    update: {},
    create: {
      id: "venue-gym",
      name: "Gymnasium",
      capacity: 350,
      location: "Sports Complex",
      description: "Open floor venue for large organization activities.",
      status: "ACTIVE",
      pricePerHour: 0,
      amenities: {
        connect: [{ id: sound.id }, { id: chairs.id }],
      },
    },
  });

  await prisma.eventSpace.upsert({
    where: { id: "venue-function-hall" },
    update: {},
    create: {
      id: "venue-function-hall",
      name: "Function Hall",
      capacity: 120,
      location: "Administration Building, 2nd Floor",
      description: "Flexible indoor venue for councils, seminars, and receptions.",
      status: "ACTIVE",
      pricePerHour: 0,
      amenities: {
        connect: [{ id: wifi.id }, { id: projector.id }, { id: air.id }],
      },
    },
  });

  await prisma.venueBlock.create({
    data: {
      id: uuid(),
      title: "University Foundation Week",
      reason: "University event",
      startAt: new Date("2026-06-20T08:00:00"),
      endAt: new Date("2026-06-20T18:00:00"),
      createdById: superAdmin.id,
    },
  });

  console.log("Seed complete.");
  console.log("Super admin: superadmin@lcup.edu.ph / superadmin123");
  console.log("Officer: officer@lcup.edu.ph / officer123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
