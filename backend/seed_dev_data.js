const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with test profiles...");

  // Clear existing data in reverse order of dependencies
  console.log("Clearing existing data...");
  await prisma.pushSubscription.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.packingItem.deleteMany({});
  await prisma.packingList.deleteMany({});
  await prisma.packingTemplateItem.deleteMany({});
  await prisma.packingTemplate.deleteMany({});
  await prisma.hotel.deleteMany({});
  await prisma.scheduleEvent.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.doctorProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await argon2.hash("Password123");

  // Create Users
  console.log("Creating users...");
  const docUser = await prisma.user.create({
    data: {
      name: "Dr. Andi Sp.PD",
      email: "doctor@example.com",
      phone: "+6281234567890",
      passwordHash,
    }
  });

  const ownerUser = await prisma.user.create({
    data: {
      name: "Sarah (Owner Assistant)",
      email: "owner@example.com",
      phone: "+6281234567891",
      passwordHash,
    }
  });

  const assistantUser = await prisma.user.create({
    data: {
      name: "Rina (Assistant)",
      email: "assistant@example.com",
      phone: "+6281234567892",
      passwordHash,
    }
  });

  const viewerUser = await prisma.user.create({
    data: {
      name: "Budi (Viewer)",
      email: "viewer@example.com",
      phone: "+6281234567893",
      passwordHash,
    }
  });

  // Create Doctor Profile
  console.log("Creating doctor profile...");
  const docProfile = await prisma.doctorProfile.create({
    data: {
      userId: docUser.id,
      specialization: "Internal Medicine",
      strNumber: "STR-987654321",
      defaultTimezone: "Asia/Jakarta",
    }
  });

  // Create Memberships linking to this Doctor Profile
  console.log("Creating memberships...");
  await prisma.membership.create({
    data: {
      userId: docUser.id,
      doctorProfileId: docProfile.id,
      role: "doctor",
      status: "active",
    }
  });

  await prisma.membership.create({
    data: {
      userId: ownerUser.id,
      doctorProfileId: docProfile.id,
      role: "owner_assistant",
      status: "active",
    }
  });

  await prisma.membership.create({
    data: {
      userId: assistantUser.id,
      doctorProfileId: docProfile.id,
      role: "assistant",
      status: "active",
    }
  });

  await prisma.membership.create({
    data: {
      userId: viewerUser.id,
      doctorProfileId: docProfile.id,
      role: "viewer",
      status: "active",
    }
  });

  // Create a sample Trip
  console.log("Creating sample trip...");
  const sampleTrip = await prisma.trip.create({
    data: {
      doctorProfileId: docProfile.id,
      title: "Annual Cardiology Conference 2026",
      destinationCity: "Singapore",
      destinationCountry: "Singapore",
      startDate: new Date("2026-07-05T00:00:00.000Z"),
      endDate: new Date("2026-07-08T00:00:00.000Z"),
      purpose: "Attending and presenting research on cardiovascular advancements",
      status: "confirmed",
      createdById: ownerUser.id,
    }
  });

  // Create a sample Hotel Booking
  console.log("Creating sample hotel...");
  await prisma.hotel.create({
    data: {
      tripId: sampleTrip.id,
      name: "Marina Bay Sands",
      formattedAddress: "10 Bayfront Ave, Singapore 018956",
      latitude: 1.2829,
      longitude: 103.8585,
      checkIn: new Date("2026-07-05T14:00:00.000Z"),
      checkOut: new Date("2026-07-08T12:00:00.000Z"),
      bookingStatus: "confirmed",
      bookingReference: "AGD-88213X",
      price: 1500.00,
      currency: "SGD",
      platform: "agoda",
      notes: "Deluxe room with city view. Breakfast included.",
    }
  });

  // Create some sample tasks
  console.log("Creating sample tasks...");
  await prisma.task.create({
    data: {
      doctorProfileId: docProfile.id,
      tripId: sampleTrip.id,
      title: "Confirm visa requirements for Singapore",
      description: "Check if Indonesian passport holders need any transit visa or pre-entry clearance.",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // due in 24 hours
      assignedToId: assistantUser.id,
      priority: "high",
      status: "open",
      createdById: ownerUser.id,
    }
  });

  await prisma.task.create({
    data: {
      doctorProfileId: docProfile.id,
      tripId: sampleTrip.id,
      title: "Print boarding passes and conference ticket",
      description: "Keep printed copies in the travel folder.",
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      assignedToId: docUser.id,
      priority: "medium",
      status: "open",
      createdById: ownerUser.id,
    }
  });

  // Create sample notifications
  console.log("Creating sample notifications...");
  await prisma.notification.create({
    data: {
      recipientUserId: ownerUser.id,
      title: "New Hotel Booked",
      body: "Rina booked Marina Bay Sands for Annual Cardiology Conference 2026",
      entityType: "hotel",
      isRead: false,
    }
  });

  await prisma.notification.create({
    data: {
      recipientUserId: ownerUser.id,
      title: "Task Assigned",
      body: "Print boarding passes and conference ticket has been assigned to Dr. Andi",
      entityType: "task",
      isRead: true,
    }
  });

  console.log("Database successfully seeded!");
  console.log("Users created:");
  console.log("- Doctor: doctor@example.com (Password123)");
  console.log("- Owner Assistant: owner@example.com (Password123)");
  console.log("- Assistant: assistant@example.com (Password123)");
  console.log("- Viewer: viewer@example.com (Password123)");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
