import type { LucideIcon } from 'lucide-react';
import { Code2, ListChecks, User } from 'lucide-react';

export type AppNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const appNavItems: AppNavItem[] = [
  {
    href: '/challenges',
    label: 'Challenges',
    description: 'Browse and solve',
    icon: Code2,
  },
  {
    href: '/submissions',
    label: 'Submissions',
    description: 'Your history',
    icon: ListChecks,
  },
  {
    href: '/profile',
    label: 'Profile',
    description: 'Progress and settings',
    icon: User,
  },
];
