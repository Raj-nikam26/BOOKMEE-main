// Keep in sync with frontend/src/constants/categories.js
export const CATEGORIES = [
  { id: 'health-wellness', label: 'Health & Wellness' },
  { id: 'beauty-salon', label: 'Beauty & Salon' },
  { id: 'fitness-yoga', label: 'Fitness & Yoga' },
  { id: 'education', label: 'Education & Tutoring' },
  { id: 'consulting', label: 'Business Consulting' },
  { id: 'home-services', label: 'Home Services' },
  { id: 'legal-finance', label: 'Legal & Finance' },
  { id: 'pet-care', label: 'Pet Care' },
];

export const DEFAULT_CATEGORY = 'health-wellness';

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export const isValidCategory = (id) => CATEGORY_IDS.includes(id);

export const getCategoryLabel = (id) => (
  CATEGORIES.find((category) => category.id === id)?.label || 'Other'
);
