import React from 'react';
import { EntityType } from '../types';
import { User, Briefcase, Coins, Rocket, GraduationCap, Building2 } from 'lucide-react';

interface EntityAvatarProps {
  type: EntityType;
  className?: string;
  iconSize?: string;
}

export const EntityAvatar: React.FC<EntityAvatarProps> = ({
  type,
  className = "w-12 h-12 rounded-2xl",
  iconSize = "w-6 h-6"
}) => {
  switch (type) {
    case 'Girişimci':
      return (
        <div className={`${className} bg-blue-100/90 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 shadow-sm`}>
          <User className={iconSize} />
        </div>
      );
    case 'Yatırımcı (VC)':
      return (
        <div className={`${className} bg-purple-100/90 text-purple-700 border border-purple-200/80 flex items-center justify-center shrink-0 shadow-sm`}>
          <Briefcase className={iconSize} />
        </div>
      );
    case 'Melek Yatırımcı':
      return (
        <div className={`${className} bg-amber-100/90 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-sm`}>
          <Coins className={iconSize} />
        </div>
      );
    case 'Startup':
      return (
        <div className={`${className} bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-sm`}>
          <Rocket className={iconSize} />
        </div>
      );
    case 'Hızlandırıcı & Kuluçka':
      return (
        <div className={`${className} bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shrink-0 shadow-sm`}>
          <GraduationCap className={iconSize} />
        </div>
      );
    default:
      return (
        <div className={`${className} bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm`}>
          <Building2 className={iconSize} />
        </div>
      );
  }
};
