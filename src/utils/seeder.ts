// src/utils/seeder.ts
import { createDb, type Env } from "../db";
import { users, locations } from "../db/schema";
import { eq } from "drizzle-orm";
import { CryptoHelper } from "./crypto.helper";

export async function seedAdminUser(env: Env) {
  const db = createDb(env.DB);
  const cryptoHelper = new CryptoHelper(env);

  // Check if admin already exists
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@company.com"))
    .limit(1);

  if (!existingAdmin) {
    const hashedPassword = await cryptoHelper.hashPassword("Admin123!");

    await db.insert(users).values({
      nip: "ADMIN001",
      name: "System Administrator",
      email: "admin@company.com",
      password: hashedPassword,
      role: "admin",
    });

    console.log("✅ Admin user created successfully");
    console.log("   NIP: ADMIN001");
    console.log("   Email: admin@company.com");
    console.log("   Password: Admin123!");
  } else {
    console.log("ℹ️ Admin user already exists");
  }
}

export async function seedSampleEmployees(env: Env) {
  const db = createDb(env.DB);
  const cryptoHelper = new CryptoHelper(env);

  const sampleEmployees = [
    {
      nip: "EMP001",
      name: "Budi Santoso",
      email: "budi.santoso@company.com",
      password: "Employee123!",
      role: "employee" as const,
    },
    {
      nip: "EMP002",
      name: "Siti Rahayu",
      email: "siti.rahayu@company.com",
      password: "Employee123!",
      role: "employee" as const,
    },
    {
      nip: "EMP003",
      name: "Ahmad Hidayat",
      email: "ahmad.hidayat@company.com",
      password: "Employee123!",
      role: "employee" as const,
    },
  ];

  for (const emp of sampleEmployees) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, emp.email))
      .limit(1);

    if (!existing) {
      const hashedPassword = await cryptoHelper.hashPassword(emp.password);

      await db.insert(users).values({
        nip: emp.nip,
        name: emp.name,
        email: emp.email,
        password: hashedPassword,
        role: emp.role,
      });

      console.log(`✅ Employee ${emp.name} (${emp.nip}) created`);
    }
  }
}

export async function seedLocations(env: Env) {
  const db = createDb(env.DB);

  const sampleLocations = [
    {
      name: "Kantor Pusat",
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
      checkInTime: "08:00",
    },
    {
      name: "Cabang Selatan",
      latitude: -6.3012,
      longitude: 106.8512,
      radius: 150,
      checkInTime: "08:30",
    },
    {
      name: "Coworking Space",
      latitude: -6.2251,
      longitude: 106.8122,
      radius: 200,
      checkInTime: "09:00",
    },
  ];

  for (const loc of sampleLocations) {
    const [existing] = await db
      .select()
      .from(locations)
      .where(eq(locations.name, loc.name))
      .limit(1);

    if (!existing) {
      await db.insert(locations).values(loc);
      console.log(`✅ Location "${loc.name}" created`);
    }
  }
}

// Run all seeders
export async function seedAll(env: Env) {
  console.log("🌱 Starting database seeding...\n");

  await seedAdminUser(env);
  await seedSampleEmployees(env);
  await seedLocations(env);

  console.log("\n✅ Database seeding completed!");
}
