/**
 * Seed the iPaaS database with demo data.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding iPaaS database...');

  // ── Users & Accounts ────────────────────────────────

  const demoUser = await prisma.user.upsert({
    where: { id: 'demo-user' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'demo@integrera.no',
      name: 'Demo Bruker',
      passwordHash: hashPassword('demo123'),
    },
  });

  const demoAccount = await prisma.account.upsert({
    where: { id: 'demo-account' },
    update: {},
    create: {
      id: 'demo-account',
      name: 'Demo Organisasjon AS',
      ownerId: demoUser.id,
    },
  });

  await prisma.accountUser.upsert({
    where: { userId_accountId: { userId: demoUser.id, accountId: demoAccount.id } },
    update: {},
    create: {
      userId: demoUser.id,
      accountId: demoAccount.id,
      role: 'owner',
    },
  });

  console.log('Created user and account:', { user: demoUser.email, account: demoAccount.name });

  // ── Integration Catalog ─────────────────────────────

  const tripletex = await prisma.integration.upsert({
    where: { id: 'int-tripletex' },
    update: {},
    create: {
      id: 'int-tripletex',
      name: 'Tripletex',
      description: 'Norsk regnskapssystem. Stotter fakturaer, kunder, produkter, kontoplan og hovedbok.',
      category: 'regnskap',
      logoUrl: '/logos/tripletex.svg',
      authType: 'api_key',
      baseUrl: 'https://tripletex.no/v2',
    },
  });

  const shopify = await prisma.integration.upsert({
    where: { id: 'int-shopify' },
    update: {},
    create: {
      id: 'int-shopify',
      name: 'Shopify',
      description: 'E-handelsplattform. Stotter ordrer, kunder, produkter og lager.',
      category: 'nettbutikk',
      logoUrl: '/logos/shopify.svg',
      authType: 'api_key',
      baseUrl: 'https://{store}.myshopify.com/admin/api/2024-01',
    },
  });

  const vipps = await prisma.integration.upsert({
    where: { id: 'int-vipps' },
    update: {},
    create: {
      id: 'int-vipps',
      name: 'Vipps MobilePay',
      description: 'Norsk betalingslosning. Stotter betalinger, oppgjor og refusjoner.',
      category: 'betaling',
      logoUrl: '/logos/vipps.svg',
      authType: 'oauth2',
      baseUrl: 'https://api.vipps.no',
    },
  });

  const woocommerce = await prisma.integration.upsert({
    where: { id: 'int-woocommerce' },
    update: {},
    create: {
      id: 'int-woocommerce',
      name: 'WooCommerce',
      description: 'WordPress-basert nettbutikk. Stotter ordrer, kunder og produkter.',
      category: 'nettbutikk',
      logoUrl: '/logos/woocommerce.svg',
      authType: 'api_key',
      baseUrl: 'https://{site}/wp-json/wc/v3',
    },
  });

  const hubspot = await prisma.integration.upsert({
    where: { id: 'int-hubspot' },
    update: {},
    create: {
      id: 'int-hubspot',
      name: 'HubSpot',
      description: 'CRM-plattform. Stotter kontakter, selskaper, avtaler og markedsforing.',
      category: 'crm',
      logoUrl: '/logos/hubspot.svg',
      authType: 'oauth2',
      baseUrl: 'https://api.hubapi.com',
    },
  });

  const poweroffice = await prisma.integration.upsert({
    where: { id: 'int-poweroffice' },
    update: {},
    create: {
      id: 'int-poweroffice',
      name: 'PowerOffice Go',
      description: 'Norsk regnskaps- og ERP-system. Stotter fakturaer, kunder og leverandorer.',
      category: 'regnskap',
      logoUrl: '/logos/poweroffice.svg',
      authType: 'oauth2',
      baseUrl: 'https://api.poweroffice.net',
    },
  });

  console.log('Created integration catalog');

  // ── Workflow Templates ──────────────────────────────

  const shopifyTripletexWf = await prisma.workflow.upsert({
    where: { id: 'wf-shopify-tripletex-orders' },
    update: {},
    create: {
      id: 'wf-shopify-tripletex-orders',
      name: 'Shopify ordrer til Tripletex fakturaer',
      description: 'Synkroniser betalte ordrer fra Shopify til fakturaer i Tripletex. Handterer MVA-koder basert pa kundens land.',
      sourceIntegrationId: shopify.id,
      targetIntegrationId: tripletex.id,
      category: 'sync',
      defaultJsLogic: `// Shopify -> Tripletex ordresynkronisering
// Tilgjengelig: $v (variabler), $u (hjelpefunksjoner)

var config = {
  source: {
    api_name: "shopify",
    params: {
      status: "paid",
      created_at_min: $u.AddDays(new Date(), -1)
    }
  },
  target: {
    api_name: "tripletex",
    config: {
      invoice_as_draft: $v.tripletex_draft_mode || false,
      default_vat_code: 3
    }
  },
  mapping: {
    "customer_name": "source.customer.first_name + ' ' + source.customer.last_name",
    "customer_email": "source.customer.email",
    "invoice_date": "$u.ShortDate()",
    "due_date": "$u.AddDays(new Date(), 14)",
    "order_reference": "source.order_number",
    "lines": "source.line_items"
  },
  options: {
    skip_existing: true,
    batch_size: 50
  }
};

console.log("Konfigurert Shopify->Tripletex synk");
console.log("Henter ordrer fra: " + config.source.params.created_at_min);

return config;`,
    },
  });

  const vippsTripletexWf = await prisma.workflow.upsert({
    where: { id: 'wf-vipps-tripletex-reconciliation' },
    update: {},
    create: {
      id: 'wf-vipps-tripletex-reconciliation',
      name: 'Vipps avstemming mot Tripletex',
      description: 'Automatisk avstemming av Vipps-betalinger mot fakturaer i Tripletex.',
      sourceIntegrationId: vipps.id,
      targetIntegrationId: tripletex.id,
      category: 'sync',
      defaultJsLogic: `// Vipps -> Tripletex avstemming
var config = {
  source: {
    api_name: "vipps",
    params: {
      settlement_date: $u.ShortDate()
    }
  },
  target: {
    api_name: "tripletex",
    config: {
      match_by: "order_reference",
      mark_as_paid: true
    }
  },
  mapping: {
    "payment_amount": "source.amount",
    "order_reference": "source.orderId",
    "payment_date": "source.timestamp"
  }
};

console.log("Starter Vipps-avstemming for " + $u.ShortDate());
return config;`,
    },
  });

  await prisma.workflow.upsert({
    where: { id: 'wf-shopify-hubspot-customers' },
    update: {},
    create: {
      id: 'wf-shopify-hubspot-customers',
      name: 'Shopify kunder til HubSpot kontakter',
      description: 'Synkroniser nye Shopify-kunder til HubSpot som kontakter for markedsforing.',
      sourceIntegrationId: shopify.id,
      targetIntegrationId: hubspot.id,
      category: 'sync',
      defaultJsLogic: `// Shopify -> HubSpot kundesynk
var config = {
  source: {
    api_name: "shopify",
    params: { entity: "customers", created_at_min: $u.AddDays(new Date(), -7) }
  },
  target: {
    api_name: "hubspot",
    config: { create_as: "contact", lifecycle_stage: "customer" }
  },
  mapping: {
    "email": "source.email",
    "firstname": "source.first_name",
    "lastname": "source.last_name",
    "phone": "source.phone"
  }
};
console.log("Synker Shopify-kunder til HubSpot");
return config;`,
    },
  });

  await prisma.workflow.upsert({
    where: { id: 'wf-woo-tripletex-orders' },
    update: {},
    create: {
      id: 'wf-woo-tripletex-orders',
      name: 'WooCommerce ordrer til Tripletex',
      description: 'Synkroniser WooCommerce-ordrer til Tripletex for fakturering og regnskap.',
      sourceIntegrationId: woocommerce.id,
      targetIntegrationId: tripletex.id,
      category: 'sync',
      defaultJsLogic: `// WooCommerce -> Tripletex ordresynk
var config = {
  source: { api_name: "woocommerce", params: { status: "completed" } },
  target: { api_name: "tripletex", config: { invoice_as_draft: true } },
  mapping: {
    "customer_name": "source.billing.first_name + ' ' + source.billing.last_name",
    "total": "source.total",
    "order_id": "source.id"
  }
};
console.log("Synker WooCommerce-ordrer til Tripletex");
return config;`,
    },
  });

  await prisma.workflow.upsert({
    where: { id: 'wf-hubspot-poweroffice-deals' },
    update: {},
    create: {
      id: 'wf-hubspot-poweroffice-deals',
      name: 'HubSpot avtaler til PowerOffice Go',
      description: 'Opprett fakturaer i PowerOffice Go fra lukkede HubSpot-avtaler.',
      sourceIntegrationId: hubspot.id,
      targetIntegrationId: poweroffice.id,
      category: 'sync',
      defaultJsLogic: `// HubSpot -> PowerOffice Go fakturasynk
var config = {
  source: { api_name: "hubspot", params: { entity: "deals", stage: "closedwon" } },
  target: { api_name: "poweroffice", config: { create_invoice: true } },
  mapping: {
    "customer": "source.company_name",
    "amount": "source.amount",
    "description": "source.dealname"
  }
};
console.log("Synker HubSpot-avtaler til PowerOffice");
return config;`,
    },
  });

  console.log('Created workflow templates');

  // ── Demo Account Workflows ──────────────────────────

  const aw1 = await prisma.accountWorkflow.upsert({
    where: { accountId_workflowId: { accountId: demoAccount.id, workflowId: shopifyTripletexWf.id } },
    update: {},
    create: {
      accountId: demoAccount.id,
      workflowId: shopifyTripletexWf.id,
      isActive: true,
      scheduleCronExpression: '0 */6 * * *',
      lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  const aw2 = await prisma.accountWorkflow.upsert({
    where: { accountId_workflowId: { accountId: demoAccount.id, workflowId: vippsTripletexWf.id } },
    update: {},
    create: {
      accountId: demoAccount.id,
      workflowId: vippsTripletexWf.id,
      isActive: false,
      scheduleCronExpression: '0 2 * * *',
      lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  console.log('Created account workflows');

  // ── Demo Account Variables ──────────────────────────

  const variables = [
    { key: 'shopify_store_domain', valueJson: '"min-butikk.myshopify.com"', isSecret: false },
    { key: 'shopify_api_key', valueJson: '"shpat_demo_key_1234567890"', isSecret: true },
    { key: 'tripletex_consumer_token', valueJson: '"tt_consumer_demo_token"', isSecret: true },
    { key: 'tripletex_draft_mode', valueJson: 'true', isSecret: false },
    { key: 'default_vat_rate', valueJson: '25', isSecret: false },
  ];

  for (const v of variables) {
    await prisma.accountVariable.upsert({
      where: { accountId_key: { accountId: demoAccount.id, key: v.key } },
      update: {},
      create: { accountId: demoAccount.id, ...v },
    });
  }

  console.log('Created account variables');

  // ── Demo Account Functions ──────────────────────────

  const functions = [
    {
      functionName: 'calculateVat',
      jsCode: 'return function(amount, rate) { return Math.round(amount * (rate || 25) / 100 * 100) / 100; }',
      description: 'Beregn MVA-belop fra totalbelop og sats',
    },
    {
      functionName: 'mapCountryToVatCode',
      jsCode: 'return function(cc) { var m = {"NO":3,"SE":52,"DK":52,"FI":52,"DE":52,"GB":6,"US":6}; return m[cc]||6; }',
      description: 'Konverter landskode til Tripletex MVA-kode',
    },
    {
      functionName: 'formatNorwegianDate',
      jsCode: `return function(ds) { var d=new Date(ds); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear(); }`,
      description: 'Formater dato til norsk format (dd.mm.yyyy)',
    },
  ];

  for (const fn of functions) {
    await prisma.accountFunction.upsert({
      where: { accountId_functionName: { accountId: demoAccount.id, functionName: fn.functionName } },
      update: {},
      create: { accountId: demoAccount.id, ...fn },
    });
  }

  console.log('Created account functions');

  // ── Demo Workflow Runs ──────────────────────────────

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Delete existing runs first for clean seeding
  await prisma.workflowRun.deleteMany({});

  await prisma.workflowRun.createMany({
    data: [
      {
        id: 'run-1',
        accountWorkflowId: aw1.id,
        startTime: oneDayAgo,
        endTime: new Date(oneDayAgo.getTime() + 2300),
        status: 'success',
        logOutput: 'Konfigurert Shopify->Tripletex synk\n24 ordrer prosessert',
        recordsProcessed: 24,
        recordsCreated: 18,
        recordsUpdated: 6,
      },
      {
        id: 'run-2',
        accountWorkflowId: aw1.id,
        startTime: twelveHoursAgo,
        endTime: new Date(twelveHoursAgo.getTime() + 1800),
        status: 'partial',
        logOutput: 'Konfigurert Shopify->Tripletex synk\n2 ordrer feilet',
        errorMessage: 'Kunde ikke funnet for ordre #1042, #1045',
        recordsProcessed: 15,
        recordsCreated: 12,
        recordsFailed: 2,
      },
      {
        id: 'run-3',
        accountWorkflowId: aw1.id,
        startTime: sixHoursAgo,
        endTime: new Date(sixHoursAgo.getTime() + 1500),
        status: 'success',
        logOutput: 'Konfigurert Shopify->Tripletex synk\n8 ordrer prosessert',
        recordsProcessed: 8,
        recordsCreated: 8,
      },
      {
        id: 'run-4',
        accountWorkflowId: aw1.id,
        startTime: twoHoursAgo,
        endTime: new Date(twoHoursAgo.getTime() + 1200),
        status: 'success',
        logOutput: 'Konfigurert Shopify->Tripletex synk\n3 ordrer prosessert',
        recordsProcessed: 3,
        recordsCreated: 3,
      },
      {
        id: 'run-5',
        accountWorkflowId: aw2.id,
        startTime: oneDayAgo,
        endTime: new Date(oneDayAgo.getTime() + 800),
        status: 'failed',
        logOutput: 'Starter Vipps-avstemming...',
        errorMessage: 'Autentisering mot Vipps feilet: Manglende API-nokler.',
      },
    ],
  });

  console.log('Created demo workflow runs');
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
