import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateHmac(stationCode: string, campaignSlug: string): string {
  const secret = 'bpcl_qr_hmac_secret_key_2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`${campaignSlug}:${stationCode}`)
    .digest('hex');
}

async function main() {
  console.log('🌱 Starting BPCL Big Rewards Database Seeding...');

  // Clean existing tables in order
  await prisma.fraudFlag.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.winner.deleteMany();
  await prisma.drawEntry.deleteMany();
  await prisma.drawSchedule.deleteMany();
  await prisma.rewardTransaction.deleteMany();
  await prisma.rewardInventory.deleteMany();
  await prisma.prizeInventory.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.fuelStation.deleteMany();
  await prisma.dSM.deleteMany();
  await prisma.user.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.campaign.deleteMany();

  // 1. Create Primary Campaign (Sapno Ki Sawari - Season 2)
  const campaign = await prisma.campaign.create({
    data: {
      slug: 'sapno-ki-sawari-season-2',
      title: 'BPCL BIG REWARDS - Sapno Ki Sawari (Season 2)',
      season: 'Season 2',
      startDate: new Date('2026-09-14T00:00:00Z'),
      endDate: new Date('2026-11-14T23:59:59Z'),
      promotionLaunch: new Date('2026-08-28T00:00:00Z'),
      isActive: true,
      rulesJson: JSON.stringify({
        minFuelAmount: 200,
        allowedFormats: ['JPG', 'PNG', 'PDF'],
        maxFileSizeMb: 5,
        maxSubmissionsPerMobilePerDay: 3,
        duplicateBillCheck: true,
        ocrValidationThreshold: 0.8,
      }),
      brandingJson: JSON.stringify({
        primaryColor: '#003366',
        secondaryColor: '#FFC72C',
        logoUrl: '/bpcl-logo.png',
        tagline: 'Fuel More. Win More.',
      }),
    },
  });
  console.log(`✅ Campaign Created: ${campaign.title}`);

  // 2. Create Territories
  const territoryA = await prisma.territory.create({
    data: { code: 'GJ-AMD', name: 'Ahmedabad Territory', state: 'Gujarat' },
  });
  const territoryS = await prisma.territory.create({
    data: { code: 'GJ-SRT', name: 'Surat Territory', state: 'Gujarat' },
  });
  const territoryV = await prisma.territory.create({
    data: { code: 'GJ-VDR', name: 'Vadodara Territory', state: 'Gujarat' },
  });
  const territoryR = await prisma.territory.create({
    data: { code: 'GJ-RJT', name: 'Rajkot Territory', state: 'Gujarat' },
  });
  console.log('✅ Territories Created');

  // 3. Create DSMs
  const dsmRakesh = await prisma.dSM.create({
    data: {
      dsmCode: 'DSM-GJ01',
      name: 'Rakesh Patel',
      mobile: '9876543210',
      email: 'rakesh.patel@bpcl.in',
      territoryId: territoryA.id,
    },
  });

  const dsmVikram = await prisma.dSM.create({
    data: {
      dsmCode: 'DSM-GJ02',
      name: 'Vikram Singh',
      mobile: '9876543211',
      email: 'vikram.singh@bpcl.in',
      territoryId: territoryS.id,
    },
  });

  const dsmAnkit = await prisma.dSM.create({
    data: {
      dsmCode: 'DSM-GJ03',
      name: 'Ankit Shah',
      mobile: '9876543212',
      email: 'ankit.shah@bpcl.in',
      territoryId: territoryV.id,
    },
  });

  // 4. Create Fuel Stations & QR Codes (Seed sample set representing 1,000 stations)
  const stationData = [
    { code: 'GJ1001', name: 'BPCL Auto Care Center', city: 'Ahmedabad', address: 'SG Highway', tId: territoryA.id, dId: dsmRakesh.id },
    { code: 'GJ1002', name: 'BPCL Highway Oasis', city: 'Ahmedabad', address: 'Sanand Circle', tId: territoryA.id, dId: dsmRakesh.id },
    { code: 'GJ1008', name: 'BPCL Platinum Station', city: 'Surat', address: 'Ring Road', tId: territoryS.id, dId: dsmVikram.id },
    { code: 'GJ1045', name: 'BPCL Express Fuel', city: 'Vadodara', address: 'Alkapuri Main', tId: territoryV.id, dId: dsmAnkit.id },
    { code: 'GJ1077', name: 'BPCL Energy Hub', city: 'Rajkot', address: 'Kalawad Road', tId: territoryR.id, dId: dsmRakesh.id },
  ];

  const stations = [];
  for (const s of stationData) {
    const station = await prisma.fuelStation.create({
      data: {
        stationCode: s.code,
        name: s.name,
        address: s.address,
        city: s.city,
        territoryId: s.tId,
        dsmId: s.dId,
        campaignId: campaign.id,
        isActive: true,
      },
    });
    stations.push(station);

    // Create HMAC QR Code
    await prisma.qRCode.create({
      data: {
        stationId: station.id,
        campaignId: campaign.id,
        hmacSignature: generateHmac(station.stationCode, campaign.slug),
        scanCount: Math.floor(Math.random() * 500) + 100,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✅ ${stations.length} Representative Fuel Stations & Cryptographic QR Codes Created`);

  // 5. Reward Inventory (Instant Scratch & Win)
  const rewardFuel = await prisma.rewardInventory.create({
    data: {
      campaignId: campaign.id,
      title: '₹100 Fuel Voucher',
      rewardType: 'FUEL_VOUCHER',
      totalQuantity: 10000,
      availableQuantity: 9240,
      unitValue: 100,
    },
  });

  const rewardShop = await prisma.rewardInventory.create({
    data: {
      campaignId: campaign.id,
      title: '₹250 Shopping Voucher',
      rewardType: 'SHOPPING_VOUCHER',
      totalQuantity: 5000,
      availableQuantity: 4820,
      unitValue: 250,
    },
  });

  const rewardCap = await prisma.rewardInventory.create({
    data: {
      campaignId: campaign.id,
      title: 'BPCL Branded Cap / Merchandise',
      rewardType: 'MERCHANDISE',
      totalQuantity: 1000,
      availableQuantity: 950,
      unitValue: 300,
    },
  });

  // 6. Draw Schedules (4 Fortnightly + 1 Grand Bumper)
  const draw1 = await prisma.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName: '1st Fortnightly Lucky Draw',
      drawType: 'FORTNIGHTLY',
      scheduledDate: new Date('2026-09-28T18:00:00Z'),
      winnerCount: 25,
      status: 'EXECUTED',
      totalEligibleEntries: 118650,
      executionHash: crypto.randomBytes(32).toString('hex'),
      executedAt: new Date('2026-09-28T18:05:00Z'),
      executedBy: 'Draw Manager',
    },
  });

  const draw2 = await prisma.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName: '2nd Fortnightly Lucky Draw',
      drawType: 'FORTNIGHTLY',
      scheduledDate: new Date('2026-10-12T18:00:00Z'),
      winnerCount: 25,
      status: 'SCHEDULED',
      totalEligibleEntries: 125430,
    },
  });

  const draw3 = await prisma.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName: '3rd Fortnightly Lucky Draw',
      drawType: 'FORTNIGHTLY',
      scheduledDate: new Date('2026-10-26T18:00:00Z'),
      winnerCount: 25,
      status: 'SCHEDULED',
    },
  });

  const draw4 = await prisma.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName: '4th Fortnightly Lucky Draw',
      drawType: 'FORTNIGHTLY',
      scheduledDate: new Date('2026-11-09T18:00:00Z'),
      winnerCount: 25,
      status: 'SCHEDULED',
    },
  });

  const drawGrand = await prisma.drawSchedule.create({
    data: {
      campaignId: campaign.id,
      drawName: 'Grand Bumper Mega Draw',
      drawType: 'GRAND_BUMPER',
      scheduledDate: new Date('2026-11-14T18:00:00Z'),
      winnerCount: 1,
      status: 'SCHEDULED',
    },
  });

  // 7. System Administrative Users
  const users = [
    { name: 'Super Admin',              email: 'admin@bpcl.in',              role: 'SUPER_ADMIN' },
    { name: 'Campaign Admin',           email: 'campaign@bpcl.in',           role: 'CAMPAIGN_ADMIN' },
    { name: 'Validation Lead',          email: 'validation@bpcl.in',         role: 'VALIDATION_TEAM' },
    { name: 'Validation Officer',       email: 'validation.officer@bpcl.in', role: 'VALIDATION_TEAM' },
    { name: 'Operations Lead',          email: 'operations@bpcl.in',         role: 'OPERATIONS_ADMIN' },
    { name: 'Operations Manager',       email: 'operations.lead@bpcl.in',    role: 'OPERATIONS_ADMIN' },
    { name: 'Draw Manager',             email: 'draw.manager@bpcl.in',       role: 'DRAW_MANAGER' },
    { name: 'Draw Auditor',             email: 'draw@bpcl.in',               role: 'DRAW_MANAGER' },
    { name: 'Fulfillment Lead',         email: 'fulfillment@bpcl.in',        role: 'FULFILLMENT_TEAM' },
    { name: 'Rakesh Patel (DSM)',       email: 'dsm.rakesh@bpcl.in',         role: 'DSM', tId: territoryA.id },
    { name: 'System Auditor',           email: 'auditor@bpcl.in',            role: 'AUDITOR' },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: '$2b$10$v0SltdrcThUUlfQrNnd9ae1N.wSM/o6Y.uA1I7gMrPSSVQXOnQ30G', // bcrypt 'admin123'
        role: u.role,
        territoryId: u.tId || null,
        isActive: true,
      },
    });
  }
  console.log('✅ System Users & RBAC Created');

  // 8. Sample Customer Registrations & Bills
  const sampleCustomers = [
    { name: 'Ramesh Chaudhari', mobile: '9825012345', vehType: 'CAR', vehNum: 'GJ01AB1234', fuel: 'PETROL', amt: 1500, bill: 'INV-2026-8801' },
    { name: 'Priya Sharma', mobile: '9825023456', vehType: 'TWO_WHEELER', vehNum: 'GJ05CD5678', fuel: 'PETROL', amt: 400, bill: 'INV-2026-8802' },
    { name: 'Amitabh Shah', mobile: '9825034567', vehType: 'CAR', vehNum: 'GJ06EF9012', fuel: 'DIESEL', amt: 2500, bill: 'INV-2026-8803' },
    { name: 'Sneha Patel', mobile: '9825045678', vehType: 'COMMERCIAL', vehNum: 'GJ18GH3456', fuel: 'DIESEL', amt: 4500, bill: 'INV-2026-8804' },
    { name: 'Karan Desai', mobile: '9825056789', vehType: 'TWO_WHEELER', vehNum: 'GJ03JK7890', fuel: 'PETROL', amt: 350, bill: 'INV-2026-8805' },
  ];

  for (let i = 0; i < sampleCustomers.length; i++) {
    const c = sampleCustomers[i];
    const customer = await prisma.customer.create({
      data: {
        fullName: c.name,
        mobileNumber: c.mobile,
      },
    });

    const station = stations[i % stations.length];

    const reg = await prisma.registration.create({
      data: {
        campaignId: campaign.id,
        stationId: station.id,
        customerId: customer.id,
        vehicleType: c.vehType,
        vehicleNumber: c.vehNum,
        fuelType: c.fuel,
        fuelAmount: c.amt,
        billNumber: c.bill,
        status: i === 4 ? 'UNDER_VALIDATION' : 'VALID',
      },
    });

    const fileHash = crypto.createHash('sha256').update(`${c.bill}:${c.amt}`).digest('hex');
    await prisma.bill.create({
      data: {
        registrationId: reg.id,
        fileKey: `uploads/bills/2026/bill_${i + 1}.jpg`,
        fileHash: fileHash,
        fileFormat: 'JPG',
        fileSize: 1024 * 350,
        ocrBillNumber: c.bill,
        ocrAmount: c.amt,
        ocrConfidence: i === 4 ? 0.65 : 0.95,
        validationStatus: i === 4 ? 'PENDING' : 'AUTO_VALIDATED',
      },
    });

    if (i < 3) {
      // Create Instant Reward
      await prisma.rewardTransaction.create({
        data: {
          registrationId: reg.id,
          rewardId: i === 0 ? rewardFuel.id : rewardShop.id,
          couponCode: `BPCL${100 + i * 50}`,
          status: 'ISSUED',
        },
      });

      // Create Draw Entry for Fortnightly Draw 1
      await prisma.drawEntry.create({
        data: {
          drawId: draw1.id,
          registrationId: reg.id,
          entryHash: crypto.createHash('sha256').update(`${reg.id}:${draw1.id}`).digest('hex'),
        },
      });
    }
  }

  // 9. Winner & Dispatch for Executed Draw 1
  const winningReg = await prisma.registration.findFirst({ where: { status: 'VALID' } });
  if (winningReg) {
    const winner = await prisma.winner.create({
      data: {
        drawId: draw1.id,
        registrationId: winningReg.id,
        prizeName: 'Smart Fitness Band / Watch',
        prizeValue: 4999,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: 'System Verification',
      },
    });

    await prisma.dispatch.create({
      data: {
        winnerId: winner.id,
        prizeName: 'Smart Fitness Band / Watch',
        shippingAddress: '123 Swastik Society, Navrangpura, Ahmedabad',
        nodalPoint: 'Ahmedabad Central BPCL Depot',
        dispatchStatus: 'DELIVERED',
        trackingNumber: 'BPCL-TRK-99012',
        receiverName: 'Ramesh Chaudhari',
        receiverMobile: '9825012345',
        deliveryPhotoUrl: '/samples/delivery_proof.jpg',
        deliverySignatureUrl: '/samples/signature.png',
        dispatchedAt: new Date('2026-09-29T10:00:00Z'),
        deliveredAt: new Date('2026-10-01T14:30:00Z'),
      },
    });
  }

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      actorRole: 'SYSTEM',
      action: 'SYSTEM_INIT',
      entityType: 'Campaign',
      entityId: campaign.id,
      newValues: JSON.stringify({ name: campaign.title, status: 'INITIALIZED' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('✅ Complete DB Seeding Finished Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
