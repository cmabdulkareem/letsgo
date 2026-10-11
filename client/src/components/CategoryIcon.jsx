import {
  Dice5, Zap, CircleDot, Circle, Triangle, Footprints, Bike, Mountain, Dumbbell,
  Gamepad2, Clapperboard, Coffee, UtensilsCrossed, Camera, Music, GraduationCap,
  Plane, Sparkles, Trophy, Landmark, Users,
} from 'lucide-react';

const ICONS = {
  cricket: Trophy,
  'circle-dot': CircleDot,
  zap: Zap,
  circle: Circle,
  triangle: Triangle,
  footprints: Footprints,
  bike: Bike,
  mountain: Mountain,
  dumbbell: Dumbbell,
  'dices-5': Dice5,
  'gamepad-2': Gamepad2,
  clapperboard: Clapperboard,
  coffee: Coffee,
  'utensils-crossed': UtensilsCrossed,
  camera: Camera,
  music: Music,
  'graduation-cap': GraduationCap,
  plane: Plane,
  sparkles: Sparkles,
  landmark: Landmark,
  users: Users,
};

export function CategoryIcon({ category, size = 40, iconSize = 20 }) {
  const Icon = ICONS[category?.icon] || Sparkles;
  const color = category?.color || '#08B981';
  return (
    <div
      style={{ width: size, height: size, backgroundColor: `${color}1A`, color }}
      className="rounded-full grid place-items-center shrink-0"
      aria-hidden
    >
      <Icon size={iconSize} />
    </div>
  );
}

/** Tinted cover block used when an activity has no uploaded photo. */
export function CategoryCover({ category, className = '', children }) {
  const color = category?.color || '#08B981';
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}26 0%, ${color}0d 55%, ${color}26 100%), linear-gradient(160deg, #10172A 0%, ${color}59 140%)`,
      }}
    >
      <div className="absolute inset-0 grid place-items-center opacity-30">
        <CategoryIcon category={category} size={120} iconSize={64} />
      </div>
      {children}
    </div>
  );
}
