/**
 * Seed the database with demo data for development.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create connectors
  const tripletex = await prisma.connector.upsert({
    where: { id: 'conn-tripletex-demo' },
    update: {},
    create: {
      id: 'conn-tripletex-demo',
      name: 'Tripletex (Demo)',
      type: 'both',
      category: 'regnskap',
      config: '{}',
      isActive: true,
    },
  });

  const shopify = await prisma.connector.upsert({
    where: { id: 'conn-shopify-demo' },
    update: {},
    create: {
      id: 'conn-shopify-demo',
      name: 'Shopify (Demo)',
      type: 'source',
      category: 'nettbutikk',
      config: '{}',
      isActive: true,
    },
  });

  const vipps = await prisma.connector.upsert({
    where: { id: 'conn-vipps-demo' },
    update: {},
    create: {
      id: 'conn-vipps-demo',
      name: 'Vipps (Demo)',
      type: 'source',
      category: 'betaling',
      config: '{}',
      isActive: true,
    },
  });

  console.log('Created connectors:', { tripletex: tripletex.id, shopify: shopify.id, vipps: vipps.id });

  // Create integrations
  const shopifyToTripletex = await prisma.integration.upsert({
    where: { id: 'int-shopify-tripletex' },
    update: {},
    create: {
      id: 'int-shopify-tripletex',
      name: 'Shopify → Tripletex ordresynk',
      sourceConnectorId: shopify.id,
      destinationConnectorId: tripletex.id,
      fieldMappings: JSON.stringify([
        { sourceField: 'order.email', destinationField: 'customer.email', sourceEntity: 'orders', destinationEntity: 'customers' },
        { sourceField: 'order.line_items[].sku', destinationField: 'invoice.orderLines[].product.number', sourceEntity: 'orders', destinationEntity: 'invoices' },
        { sourceField: 'order.line_items[].quantity', destinationField: 'invoice.orderLines[].count', sourceEntity: 'orders', destinationEntity: 'invoices' },
        { sourceField: 'order.line_items[].price', destinationField: 'invoice.orderLines[].unitCostCurrency', sourceEntity: 'orders', destinationEntity: 'invoices' },
        { sourceField: 'order.total_price', destinationField: 'invoice.amount', sourceEntity: 'orders', destinationEntity: 'invoices' },
      ]),
      transformRules: JSON.stringify([
        { condition: "record.country === 'NO'", action: 'set vatCode to 3' },
        { condition: "record.country !== 'NO' && record.isEU", action: 'set vatCode to 52' },
        { condition: "record.country !== 'NO' && !record.isEU", action: 'set vatCode to 6' },
      ]),
      schedule: '0 */6 * * *',
      status: 'active',
      errorHandling: 'skip',
    },
  });

  const vippsToTripletex = await prisma.integration.upsert({
    where: { id: 'int-vipps-tripletex' },
    update: {},
    create: {
      id: 'int-vipps-tripletex',
      name: 'Vipps → Tripletex avstemming',
      sourceConnectorId: vipps.id,
      destinationConnectorId: tripletex.id,
      fieldMappings: JSON.stringify([
        { sourceField: 'settlement.orderId', destinationField: 'invoice.orderReference', sourceEntity: 'settlements', destinationEntity: 'invoices' },
        { sourceField: 'settlement.amount', destinationField: 'payment.amount', sourceEntity: 'settlements', destinationEntity: 'invoices' },
      ]),
      transformRules: JSON.stringify([]),
      schedule: '0 2 * * *',
      status: 'paused',
      errorHandling: 'retry',
    },
  });

  console.log('Created integrations:', {
    shopifyToTripletex: shopifyToTripletex.id,
    vippsToTripletex: vippsToTripletex.id,
  });

  // Create demo sync runs
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.syncRun.createMany({
    data: [
      {
        id: 'run-1',
        integrationId: shopifyToTripletex.id,
        startedAt: oneDayAgo,
        completedAt: new Date(oneDayAgo.getTime() + 45000),
        status: 'success',
        recordsProcessed: 24,
        recordsCreated: 18,
        recordsUpdated: 6,
        recordsSkipped: 0,
        recordsFailed: 0,
        errors: '[]',
      },
      {
        id: 'run-2',
        integrationId: shopifyToTripletex.id,
        startedAt: sixHoursAgo,
        completedAt: new Date(sixHoursAgo.getTime() + 32000),
        status: 'partial',
        recordsProcessed: 15,
        recordsCreated: 12,
        recordsUpdated: 1,
        recordsSkipped: 0,
        recordsFailed: 2,
        errors: JSON.stringify([
          { record: { orderId: 1042 }, error: 'Kunde ikke funnet i Tripletex' },
          { record: { orderId: 1045 }, error: 'Ugyldig MVA-kode' },
        ]),
      },
      {
        id: 'run-3',
        integrationId: shopifyToTripletex.id,
        startedAt: twoHoursAgo,
        completedAt: new Date(twoHoursAgo.getTime() + 28000),
        status: 'success',
        recordsProcessed: 8,
        recordsCreated: 8,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        errors: '[]',
      },
      {
        id: 'run-4',
        integrationId: vippsToTripletex.id,
        startedAt: oneHourAgo,
        completedAt: new Date(oneHourAgo.getTime() + 15000),
        status: 'failed',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        errors: JSON.stringify([
          { record: null, error: 'Autentisering mot Vipps feilet: Manglende API-nøkler' },
        ]),
      },
    ],
  });

  // Update lastRunAt
  await prisma.integration.update({
    where: { id: shopifyToTripletex.id },
    data: { lastRunAt: twoHoursAgo },
  });

  await prisma.integration.update({
    where: { id: vippsToTripletex.id },
    data: { lastRunAt: oneHourAgo },
  });

  console.log('Created demo sync runs');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
