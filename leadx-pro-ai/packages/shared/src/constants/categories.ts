// ============================================
// Business Categories
// ============================================

export const BUSINESS_CATEGORIES = [
  'Marketing Agency',
  'SaaS',
  'Restaurant',
  'Manufacturer',
  'Healthcare',
  'Education',
  'Real Estate',
  'E-commerce',
  'Financial Services',
  'Legal Services',
  'Consulting',
  'Technology',
  'Construction',
  'Transportation',
  'Hospitality',
  'Retail',
  'Media & Entertainment',
  'Nonprofit',
  'Government',
  'Agriculture',
  'Energy',
  'Telecommunications',
  'Automotive',
  'Fitness & Wellness',
  'Other',
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

// ============================================
// Category Keywords for Classification
// ============================================

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Marketing Agency': [
    'marketing', 'digital marketing', 'seo', 'social media', 'advertising',
    'branding', 'content marketing', 'ppc', 'google ads', 'facebook ads',
    'email marketing', 'creative agency', 'media agency', 'pr agency',
    'public relations', 'influencer', 'campaign', 'lead generation',
  ],
  'SaaS': [
    'saas', 'software', 'cloud', 'platform', 'api', 'app', 'subscription',
    'dashboard', 'analytics', 'automation', 'crm', 'erp', 'project management',
    'devops', 'infrastructure', 'microservices', 'enterprise software',
  ],
  'Restaurant': [
    'restaurant', 'food', 'dining', 'cafe', 'bistro', 'bar', 'grill',
    'kitchen', 'catering', 'menu', 'chef', 'pizza', 'sushi', 'bakery',
    'fast food', 'delivery', 'takeout', 'dine-in',
  ],
  'Manufacturer': [
    'manufacturer', 'manufacturing', 'factory', 'production', 'industrial',
    'machinery', 'assembly', 'fabrication', 'oem', 'supply chain',
    'warehouse', 'logistics', 'quality control', 'raw materials',
  ],
  'Healthcare': [
    'healthcare', 'medical', 'hospital', 'clinic', 'doctor', 'physician',
    'dental', 'pharmacy', 'health', 'wellness', 'patient', 'therapy',
    'diagnosis', 'treatment', 'nursing', 'telehealth', 'biotech',
  ],
  'Education': [
    'education', 'school', 'university', 'college', 'training', 'course',
    'learning', 'academy', 'tutor', 'curriculum', 'student', 'teacher',
    'e-learning', 'online learning', 'certification', 'workshop',
  ],
  'Real Estate': [
    'real estate', 'property', 'realty', 'housing', 'apartment', 'mortgage',
    'broker', 'agent', 'listing', 'rental', 'commercial property',
    'residential', 'construction', 'development', 'investment property',
  ],
  'E-commerce': [
    'ecommerce', 'e-commerce', 'online store', 'shop', 'retail', 'marketplace',
    'dropshipping', 'fulfillment', 'shopping cart', 'payment', 'checkout',
    'inventory', 'product', 'wholesale', 'b2b', 'b2c',
  ],
  'Financial Services': [
    'finance', 'financial', 'banking', 'investment', 'insurance', 'accounting',
    'tax', 'wealth management', 'fintech', 'payment', 'loan', 'credit',
    'audit', 'bookkeeping', 'advisory', 'portfolio',
  ],
  'Legal Services': [
    'law', 'legal', 'attorney', 'lawyer', 'litigation', 'court',
    'compliance', 'contract', 'intellectual property', 'patent', 'trademark',
    'counsel', 'paralegal', 'arbitration', 'mediation',
  ],
  'Consulting': [
    'consulting', 'consultant', 'advisory', 'strategy', 'management consulting',
    'business consulting', 'it consulting', 'hr consulting', 'operations',
    'transformation', 'implementation', 'assessment',
  ],
  'Technology': [
    'technology', 'tech', 'it', 'software development', 'web development',
    'mobile app', 'cybersecurity', 'data', 'ai', 'machine learning',
    'blockchain', 'iot', 'hardware', 'networking', 'support',
  ],
  'Construction': [
    'construction', 'building', 'contractor', 'renovation', 'architecture',
    'engineering', 'plumbing', 'electrical', 'hvac', 'roofing',
    'landscaping', 'demolition', 'project management',
  ],
  'Transportation': [
    'transportation', 'logistics', 'shipping', 'freight', 'delivery',
    'trucking', 'courier', 'fleet', 'supply chain', 'warehousing',
    'distribution', 'cargo', 'moving',
  ],
  'Hospitality': [
    'hotel', 'hospitality', 'resort', 'tourism', 'travel', 'accommodation',
    'booking', 'vacation', 'lodging', 'inn', 'guest house', 'bed and breakfast',
    'event venue', 'conference',
  ],
  'Retail': [
    'retail', 'store', 'shop', 'boutique', 'department store', 'mall',
    'consumer goods', 'merchandise', 'fashion', 'clothing', 'electronics',
    'grocery', 'supermarket',
  ],
  'Media & Entertainment': [
    'media', 'entertainment', 'film', 'music', 'television', 'radio',
    'streaming', 'gaming', 'publishing', 'news', 'content creation',
    'production', 'studio',
  ],
  'Nonprofit': [
    'nonprofit', 'non-profit', 'charity', 'foundation', 'ngo', 'volunteer',
    'donation', 'community', 'social impact', 'humanitarian',
    'advocacy', 'fundraising',
  ],
  'Automotive': [
    'automotive', 'car', 'vehicle', 'auto', 'dealership', 'mechanic',
    'repair', 'parts', 'tire', 'body shop', 'detailing', 'fleet',
  ],
  'Fitness & Wellness': [
    'fitness', 'gym', 'yoga', 'pilates', 'personal training', 'spa',
    'massage', 'nutrition', 'dietitian', 'mental health', 'meditation',
    'wellness center', 'health club',
  ],
};
