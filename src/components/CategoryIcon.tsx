import React from 'react';
import {
  ShoppingCart,
  Home,
  Car,
  Tv,
  GraduationCap,
  ShoppingBag,
  Briefcase,
  Coins,
  HelpCircle,
} from 'lucide-react';

export interface CategoryStyle {
  icon: React.ComponentType<{ className?: string }>;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const categoryStyles: Record<string, CategoryStyle> = {
  'מזון וסופרמרקט': {
    icon: ShoppingCart,
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  'דיור וחשבונות': {
    icon: Home,
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
  'תחבורה ודלק': {
    icon: Car,
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-100',
  },
  'פנאי ובידור': {
    icon: Tv,
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
  },
  'חינוך וילדים': {
    icon: GraduationCap,
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-100',
  },
  'קניות וביגוד': {
    icon: ShoppingBag,
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-100',
  },
  'משכורת': {
    icon: Briefcase,
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
  },
  'הכנסה נוספת': {
    icon: Coins,
    textColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-100',
  },
  'אחר': {
    icon: HelpCircle,
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

export function getCategoryStyle(categoryName: string, fallbackType?: 'income' | 'expense'): CategoryStyle {
  const normalizedCategory = categoryName?.trim();
  if (categoryStyles[normalizedCategory]) {
    return categoryStyles[normalizedCategory];
  }

  // Fallback styling if category not found explicitly
  if (fallbackType === 'income') {
    return {
      icon: Coins,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    };
  }

  return {
    icon: HelpCircle,
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  };
}

interface CategoryIconProps {
  category: string;
  type?: 'income' | 'expense';
  className?: string;
  containerClassName?: string;
  showBackground?: boolean;
}

export default function CategoryIcon({
  category,
  type,
  className = 'w-5 h-5',
  containerClassName = 'p-2.5 rounded-xl shrink-0',
  showBackground = true,
}: CategoryIconProps) {
  const style = getCategoryStyle(category, type);
  const Icon = style.icon;

  if (!showBackground) {
    return <Icon className={`${style.textColor} ${className}`} />;
  }

  return (
    <div className={`${style.bgColor} ${style.textColor} border ${style.borderColor} ${containerClassName}`}>
      <Icon className={className} />
    </div>
  );
}
