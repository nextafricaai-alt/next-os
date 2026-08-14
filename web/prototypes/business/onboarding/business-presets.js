/* business-presets.js
   NEXT Business OS — onboarding config schema + business-type presets.

   This is the "PRESETS" analog for the Business OS, mirroring the pattern
   already proven in the school product (SCHOOL_CONFIG / PRESETS in
   web/prototypes/schools/peak-primary/index.html): one shared app template
   (a clone of CharisOS, unmodified — see web/prototypes/business/template/),
   configured per business via a data-driven vocabulary + workflow layer
   instead of forking the code per business type.

   This file feeds web/prototypes/business/provisioning/stamp-template.js,
   which stamps a business's onboarding answers into its own deployed copy
   of the template (see web/prototypes/business/template/) — vocabulary at
   the nav/header/button level, the pipeline stages, and (for non-photography
   types) a generated qcTemplates checklist standing in for CharisOS's native
   photography-specific one.

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
     qcTemplates                 — per-stage checklist object (keyed by stage
                                    LABEL, same shape as CharisOS's native
                                    QC_TEMPLATES: { common: [{id,label,who}] }).
                                    null for photography, which keeps using
                                    CharisOS's own native one unmodified.
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

  /* qcTemplates — the per-stage "quality control" checklist system, one
     entry per business type, keyed by that type's own stage LABELS (not
     keys — CharisOS stores a project's pipeline position as the label
     string, e.g. proj.status === 'Packing'). Mirrors the shape and level
     of detail of CharisOS's native QC_TEMPLATES object (built for its
     11-stage photography pipeline): { common: [{id,label,who}] } per
     stage, `who` a role hint. Photography keeps using CharisOS's own
     native QC_TEMPLATES untouched — these four are what the stamping
     script substitutes in for the other business types, since photography's
     rules (drone battery checks, wedding shot lists, etc.) don't apply to
     an order-fulfilment or content-agency pipeline. No event-type-specific
     variants here (CharisOS's `common` + per-event-type layering) — one
     flat checklist per stage is the right depth for a generic business
     that hasn't told us anything more specific about its own workflow. */

  var RETAIL_QC = {
    'New Enquiry': { common: [
      { id:'re-contact',  label:'Customer contact details confirmed (phone/email)', who:'Owner' },
      { id:'re-want',     label:'What the customer wants is clearly noted (item, quantity, specs)', who:'Owner' },
      { id:'re-source',   label:'Enquiry source logged (walk-in, call, social media, referral)', who:'Owner' },
    ]},
    'Quote Sent': { common: [
      { id:'qs-price',    label:'Price confirmed against current cost/stock', who:'Owner' },
      { id:'qs-sent',     label:'Quote sent to customer via their preferred channel', who:'Team' },
      { id:'qs-followup', label:'Follow-up date set if customer doesn’t respond', who:'Owner' },
    ]},
    'Order Confirmed': { common: [
      { id:'oc-items',    label:'Items and quantities locked in with customer', who:'Owner' },
      { id:'oc-address',  label:'Delivery address and date confirmed', who:'Team' },
      { id:'oc-notes',    label:'Special instructions or requests noted', who:'Team' },
    ]},
    'Payment Received': { common: [
      { id:'pr-method',   label:'Payment method confirmed (cash, mobile money, bank)', who:'Finance' },
      { id:'pr-amount',   label:'Amount received matches the invoice/quote', who:'Finance' },
      { id:'pr-receipt',  label:'Receipt issued to customer', who:'Finance' },
    ]},
    'Sourcing / Procurement': { common: [
      { id:'sp-supplier', label:'Supplier confirmed and able to fulfil', who:'Owner' },
      { id:'sp-stock',    label:'Stock availability double-checked', who:'Team' },
      { id:'sp-cost',     label:'Cost price locked in before committing', who:'Owner' },
    ]},
    'Packing': { common: [
      { id:'pk-check',    label:'Items checked against the order before packing', who:'Team' },
      { id:'pk-protect',  label:'Packaging protects goods for transit', who:'Team' },
      { id:'pk-list',     label:'Packing list / order summary included', who:'Team' },
    ]},
    'Dispatched': { common: [
      { id:'ds-courier',  label:'Courier or rider assigned', who:'Team' },
      { id:'ds-tracking', label:'Tracking info or ETA shared with customer', who:'Team' },
      { id:'ds-time',     label:'Dispatch time logged', who:'Team' },
    ]},
    'Delivered': { common: [
      { id:'dl-confirm',  label:'Delivery confirmed by customer', who:'Team' },
      { id:'dl-proof',    label:'Proof of delivery captured (photo/signature)', who:'Team' },
      { id:'dl-damage',   label:'Any damage or shortage reported and logged', who:'Team' },
    ]},
    'Closed': { common: [
      { id:'cl-satisfied',label:'Customer satisfaction confirmed', who:'Owner' },
      { id:'cl-reconcile',label:'Invoice fully reconciled — nothing outstanding', who:'Finance' },
      { id:'cl-archive',  label:'Order archived / records filed', who:'Team' },
    ]},
  };

  var MEDIA_QC = {
    'Pitch / Brief': { common: [
      { id:'pb-brief',    label:'Client brief received in writing', who:'Owner' },
      { id:'pb-goals',    label:'Objectives and target audience defined', who:'Owner' },
      { id:'pb-budget',   label:'Budget range discussed and confirmed', who:'Owner' },
    ]},
    'Approved': { common: [
      { id:'ap-scope',    label:'Scope of work signed off', who:'Owner' },
      { id:'ap-timeline', label:'Timeline agreed with client', who:'Owner' },
      { id:'ap-deliv',    label:'Deliverables list confirmed in writing', who:'Owner' },
    ]},
    'Deposit Paid': { common: [
      { id:'dp-invoice',  label:'Invoice sent to client', who:'Finance' },
      { id:'dp-received', label:'Deposit received and confirmed', who:'Finance' },
      { id:'dp-start',    label:'Start date locked in', who:'Owner' },
    ]},
    'Pre-Production': { common: [
      { id:'pp-concept',  label:'Concept, script or storyboard approved', who:'Creative' },
      { id:'pp-locations',label:'Locations and talent/participants confirmed', who:'Creative' },
      { id:'pp-shotlist', label:'Shot list or run-of-show ready', who:'Creative' },
    ]},
    'Production': { common: [
      { id:'pd-crew',     label:'Crew and equipment assigned', who:'Creative' },
      { id:'pd-schedule', label:'Shoot/production schedule confirmed with all parties', who:'Creative' },
      { id:'pd-backup',   label:'Raw footage/files backed up on-site', who:'Creative' },
    ]},
    'Post-Production': { common: [
      { id:'po-organize', label:'Footage/assets organised and logged', who:'Creative' },
      { id:'po-assign',   label:'Edit assigned to an editor', who:'Creative' },
      { id:'po-roughcut', label:'Rough cut scheduled and on track', who:'Creative' },
    ]},
    'Client Review': { common: [
      { id:'cr-draft',    label:'Draft delivered to client', who:'Owner' },
      { id:'cr-deadline', label:'Feedback deadline communicated', who:'Owner' },
      { id:'cr-tracked',  label:'Revision rounds used vs. included are tracked', who:'Owner' },
    ]},
    'Revisions': { common: [
      { id:'rv-logged',   label:'Requested changes logged clearly', who:'Creative' },
      { id:'rv-delivered',label:'Revised version delivered', who:'Creative' },
      { id:'rv-signoff',  label:'Client sign-off received or pending', who:'Owner' },
    ]},
    'Published / Delivered': { common: [
      { id:'pu-files',    label:'Final files delivered in correct format/resolution', who:'Creative' },
      { id:'pu-posted',   label:'Published or posted where agreed (if applicable)', who:'Owner' },
      { id:'pu-confirm',  label:'Client confirmed receipt', who:'Owner' },
    ]},
  };

  var SERVICES_QC = {
    'New Lead': { common: [
      { id:'nl-contact',  label:'Contact details captured', who:'Owner' },
      { id:'nl-need',     label:'Need or pain point identified', who:'Owner' },
      { id:'nl-source',   label:'Lead source logged', who:'Owner' },
    ]},
    'Discovery Call': { common: [
      { id:'dc-held',     label:'Call scheduled and held', who:'Owner' },
      { id:'dc-docs',     label:'Requirements documented', who:'Owner' },
      { id:'dc-budget',   label:'Budget and timeline discussed', who:'Owner' },
    ]},
    'Proposal Sent': { common: [
      { id:'ps-scope',    label:'Scope of work clearly defined', who:'Owner' },
      { id:'ps-pricing',  label:'Pricing confirmed', who:'Owner' },
      { id:'ps-followup', label:'Proposal sent with a follow-up date set', who:'Owner' },
    ]},
    'Negotiation': { common: [
      { id:'ng-objections', label:'Objections or concerns addressed', who:'Owner' },
      { id:'ng-terms',    label:'Terms adjusted and re-confirmed if needed', who:'Owner' },
      { id:'ng-decision',  label:'Decision-maker engaged directly', who:'Owner' },
    ]},
    'Contract Signed': { common: [
      { id:'cs-signed',   label:'Contract signed by both parties', who:'Owner' },
      { id:'cs-invoice',  label:'Deposit or first invoice issued', who:'Finance' },
      { id:'cs-kickoff',  label:'Kickoff date set', who:'Owner' },
    ]},
    'Client Onboarding': { common: [
      { id:'co-access',   label:'Access, credentials or materials collected from client', who:'Team' },
      { id:'co-meeting',  label:'Kickoff meeting held', who:'Owner' },
      { id:'co-contact',  label:'Main point of contact confirmed on both sides', who:'Owner' },
    ]},
    'In Delivery': { common: [
      { id:'id-milestones', label:'Milestones tracked against the plan', who:'Team' },
      { id:'id-updates',  label:'Client updated on progress regularly', who:'Owner' },
      { id:'id-blockers', label:'Blockers escalated promptly, not left silent', who:'Team' },
    ]},
    'Review': { common: [
      { id:'rv-internal', label:'Deliverable reviewed internally before sending', who:'Team' },
      { id:'rv-feedback', label:'Client feedback collected', who:'Owner' },
      { id:'rv-open',     label:'Outstanding items logged', who:'Team' },
    ]},
    'Complete': { common: [
      { id:'cp-accepted', label:'Final deliverable accepted by client', who:'Owner' },
      { id:'cp-paid',     label:'Final invoice issued and paid', who:'Finance' },
      { id:'cp-retro',    label:'Quick retrospective done — what to repeat/improve', who:'Owner' },
    ]},
  };

  var GENERIC_QC = {
    'New': { common: [
      { id:'nw-details',  label:'Details captured clearly', who:'Owner' },
      { id:'nw-owner',    label:'An owner is assigned', who:'Owner' },
      { id:'nw-priority', label:'Priority set', who:'Owner' },
    ]},
    'In Progress': { common: [
      { id:'ip-started',  label:'Work has actually started', who:'Team' },
      { id:'ip-blockers', label:'Blockers identified early, not discovered late', who:'Team' },
      { id:'ip-updates',  label:'Progress updated regularly', who:'Team' },
    ]},
    'Review': { common: [
      { id:'rv-checked',  label:'Work checked before handoff', who:'Team' },
      { id:'rv-feedback', label:'Feedback collected', who:'Owner' },
      { id:'rv-logged',   label:'Requested changes logged', who:'Team' },
    ]},
    'Done': { common: [
      { id:'dn-confirmed',label:'Deliverable confirmed complete', who:'Owner' },
      { id:'dn-notified', label:'Client or stakeholder notified', who:'Owner' },
      { id:'dn-closed',   label:'Record closed out', who:'Team' },
    ]},
  };

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
      // No qcTemplates here on purpose — photography's stages match the
      // template's own native pipeline exactly, so the stamping script
      // leaves CharisOS's existing, richer, event-type-aware QC_TEMPLATES
      // untouched instead of overwriting it with a flatter generated one.
      qcTemplates: null,
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
      qcTemplates: RETAIL_QC,
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
      qcTemplates: MEDIA_QC,
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
      qcTemplates: SERVICES_QC,
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
      qcTemplates: GENERIC_QC,
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
