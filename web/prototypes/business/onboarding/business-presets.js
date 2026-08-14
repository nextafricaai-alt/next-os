/* business-presets.js
   NEXT Business OS — onboarding config schema + business-type presets.

   This is the "PRESETS" analog for the Business OS, mirroring the pattern
   already proven in the school product (SCHOOL_CONFIG / PRESETS in
   web/prototypes/schools/peak-primary/index.html): one shared app template
   (a clone of CharisOS, unmodified — see web/prototypes/business/template/),
   configured per business via a data-driven vocabulary + workflow layer
   instead of forking the code per business type.

   NOTHING in here is wired into the CharisOS template yet — that's the next
   phase. This file defines the SHAPE of what onboarding collects and what a
   finished BUSINESS_CONFIG object looks like, plus five starter presets used
   to pre-fill sensible defaults for the vocabulary/pipeline the wizard shows.

   window.BUSINESS_TYPE_PRESETS — keyed by type id, each entry:
     label, icon, description   — for the picker card
     vocabulary                 — { project, projects, client, clients,
                                     equipment, equipmentSingular, retainer,
                                     retainers, teamMember } term overrides.
                                   CharisOS's own defaults (Project/Client/
                                   Equipment/Retainer/Team) are the implicit
                                   fallback for any key a preset doesn't set.
     pipelineStages              — ordered array of {key, label} status
                                    stages, replacing CharisOS's own
                                    photography-specific 11-stage pipeline
                                    (Inquiry -> ... -> Delivered).
     serviceCategoryHints        — quick-pick chips shown in "what do you
                                    offer" to speed up free-text entry.
     expenseCategoryHints        — quick-pick chips for common expense types
                                    (feeds Finance -> Expenses category list).
*/
(function () {

  var PHOTOGRAPHY_STAGES = [
    { key: 'inquiry',    label: 'Inquiry' },
    { key: 'quoted',     label: 'Quotation Sent' },
    { key: 'confirmed',  label: 'Booking Confirmed' },
    { key: 'deposit',    label: 'Deposit Paid' },
    { key: 'contract',   label: 'Contract Signed' },
    { key: 'planning',   label: 'Shoot Planning' },
    { key: 'shootday',   label: 'Shoot Day' },
    { key: 'backup',     label: 'Data Backup' },
    { key: 'editing',    label: 'Editing' },
    { key: 'review',     label: 'Review & Revisions' },
    { key: 'delivered',  label: 'Delivered' },
  ];

  var RETAIL_STAGES = [
    { key: 'lead',       label: 'New Enquiry' },
    { key: 'quoted',     label: 'Quote Sent' },
    { key: 'confirmed',  label: 'Order Confirmed' },
    { key: 'paid',       label: 'Payment Received' },
    { key: 'sourcing',   label: 'Sourcing / Procurement' },
    { key: 'packing',    label: 'Packing' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'delivered',  label: 'Delivered' },
    { key: 'closed',     label: 'Closed' },
  ];

  var MEDIA_STAGES = [
    { key: 'pitch',      label: 'Pitch / Brief' },
    { key: 'approved',   label: 'Approved' },
    { key: 'deposit',    label: 'Deposit Paid' },
    { key: 'preprod',    label: 'Pre-Production' },
    { key: 'production', label: 'Production' },
    { key: 'postprod',   label: 'Post-Production' },
    { key: 'review',     label: 'Client Review' },
    { key: 'revisions',  label: 'Revisions' },
    { key: 'published',  label: 'Published / Delivered' },
  ];

  var SERVICES_STAGES = [
    { key: 'lead',        label: 'New Lead' },
    { key: 'discovery',   label: 'Discovery Call' },
    { key: 'proposal',    label: 'Proposal Sent' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'signed',      label: 'Contract Signed' },
    { key: 'onboarding',  label: 'Client Onboarding' },
    { key: 'delivery',    label: 'In Delivery' },
    { key: 'review',      label: 'Review' },
    { key: 'complete',    label: 'Complete' },
  ];

  var GENERIC_STAGES = [
    { key: 'new',       label: 'New' },
    { key: 'inprogress',label: 'In Progress' },
    { key: 'review',    label: 'Review' },
    { key: 'done',      label: 'Done' },
  ];

  window.BUSINESS_TYPE_PRESETS = {

    photography: {
      label: 'Photography & Events',
      icon: '📷',
      description: 'Weddings, portraits, studio sessions, event coverage',
      vocabulary: {
        // CharisOS's own native vocabulary — listed explicitly (not left
        // implicit) so every preset is equally complete and the wizard
        // never has to special-case "the original one".
        project: 'Project', projects: 'Projects',
        client: 'Client', clients: 'Clients',
        equipmentSingular: 'Equipment Item', equipment: 'Equipment',
        retainer: 'Retainer', retainers: 'Retainers',
        teamMember: 'Crew Member',
      },
      pipelineStages: PHOTOGRAPHY_STAGES,
      serviceCategoryHints: ['Weddings', 'Portraits', 'Studio Sessions', 'Events', 'Corporate Headshots', 'Videography'],
      expenseCategoryHints: ['Equipment Rental', 'Travel', 'Studio Rent', 'Printing', 'Backup Storage', 'Assistant Pay'],
    },

    retail: {
      label: 'Retail & Commerce',
      icon: '🛍️',
      description: 'Physical or online goods, stock, orders and delivery',
      vocabulary: {
        project: 'Order', projects: 'Orders',
        client: 'Customer', clients: 'Customers',
        equipmentSingular: 'Inventory Item', equipment: 'Inventory',
        retainer: 'Subscription', retainers: 'Subscriptions',
        teamMember: 'Staff Member',
      },
      pipelineStages: RETAIL_STAGES,
      serviceCategoryHints: ['Clothing & Fashion', 'Electronics', 'Groceries', 'Home & Furniture', 'Beauty & Cosmetics', 'Wholesale'],
      expenseCategoryHints: ['Stock Purchase', 'Shipping', 'Packaging', 'Storefront Rent', 'Marketing', 'Delivery Fuel'],
    },

    media: {
      label: 'Media & Creative Agency',
      icon: '🎬',
      description: 'Content, campaigns, video, design, social production',
      vocabulary: {
        project: 'Campaign', projects: 'Campaigns',
        client: 'Client', clients: 'Clients',
        equipmentSingular: 'Production Asset', equipment: 'Production Assets',
        retainer: 'Retainer', retainers: 'Retainers',
        teamMember: 'Creative',
      },
      pipelineStages: MEDIA_STAGES,
      serviceCategoryHints: ['Social Media Content', 'Video Production', 'Graphic Design', 'Brand Campaigns', 'Photography', 'Copywriting'],
      expenseCategoryHints: ['Equipment', 'Freelancer Fees', 'Location Fees', 'Software Subscriptions', 'Ad Spend', 'Travel'],
    },

    services: {
      label: 'Professional Services',
      icon: '💼',
      description: 'Consulting, agencies, private companies, B2B services',
      vocabulary: {
        project: 'Engagement', projects: 'Engagements',
        client: 'Client', clients: 'Clients',
        equipmentSingular: 'Asset', equipment: 'Assets',
        retainer: 'Retainer', retainers: 'Retainers',
        teamMember: 'Team Member',
      },
      pipelineStages: SERVICES_STAGES,
      serviceCategoryHints: ['Consulting', 'Legal Services', 'Accounting', 'IT & Software', 'Recruitment', 'Training'],
      expenseCategoryHints: ['Office Rent', 'Software & Tools', 'Travel', 'Professional Fees', 'Marketing', 'Utilities'],
    },

    custom: {
      label: 'Something Else',
      icon: '✨',
      description: "Doesn't fit the above? Start simple and rename anything.",
      vocabulary: {
        project: 'Job', projects: 'Jobs',
        client: 'Client', clients: 'Clients',
        equipmentSingular: 'Asset', equipment: 'Assets',
        retainer: 'Retainer', retainers: 'Retainers',
        teamMember: 'Team Member',
      },
      pipelineStages: GENERIC_STAGES,
      serviceCategoryHints: [],
      expenseCategoryHints: ['Supplies', 'Rent', 'Travel', 'Marketing', 'Utilities'],
    },
  };

  var TEAM_SIZE_RANGES = ['Just me', '2–5 people', '6–20 people', '21–50 people', '50+ people'];

  var CURRENCIES = ['UGX', 'KES', 'TZS', 'NGN', 'GHS', 'ZAR', 'USD', 'GBP', 'EUR'];

  /* Builds the final config object the provisioning step (next phase) will
     consume. Kept as one pure function so the wizard, and later any
     provisioning/admin tool, produce and validate the exact same shape. */
  function buildBusinessConfig(answers) {
    var preset = window.BUSINESS_TYPE_PRESETS[answers.businessType] || window.BUSINESS_TYPE_PRESETS.custom;
    return {
      schemaVersion: 1,
      businessType: answers.businessType,
      businessName: (answers.businessName || '').trim(),
      tagline: (answers.tagline || '').trim(),
      currency: answers.currency || 'UGX',
      brandColor: answers.brandColor || '#E86418',
      logoDataUrl: answers.logoDataUrl || null,
      teamSizeRange: answers.teamSizeRange || TEAM_SIZE_RANGES[0],
      servicesOffered: (answers.servicesOffered || '').trim(),
      vocabulary: Object.assign({}, preset.vocabulary, answers.vocabularyOverrides || {}),
      pipelineStages: (answers.pipelineStages && answers.pipelineStages.length) ? answers.pipelineStages : preset.pipelineStages,
      owner: {
        name: (answers.ownerName || '').trim(),
        email: (answers.ownerEmail || '').trim(),
        phone: (answers.ownerPhone || '').trim(),
      },
      createdAt: new Date().toISOString(),
    };
  }

  window.BUSINESS_ONBOARDING = {
    TEAM_SIZE_RANGES: TEAM_SIZE_RANGES,
    CURRENCIES: CURRENCIES,
    buildBusinessConfig: buildBusinessConfig,
  };
})();
