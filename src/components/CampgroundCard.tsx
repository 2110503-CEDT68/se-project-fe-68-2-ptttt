import { MapPin, Phone, Flame ,Star } from "lucide-react";

export interface CardProps {
  name: string;
  picture: string;
  address: string;
  tel: string;
  averageRating:number;
  totalReviews:number;
}

export default function CampgroundCard({
  name,
  picture,
  address,
  tel,
  averageRating,
  totalReviews
}: CardProps) {
  return (
    <div className="w-full h-full rounded-xl border border-slate-700/50 bg-[#12172a] overflow-hidden hover:border-orange-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer">
      {/* Picture Section */}
      <div className="relative w-full h-56 bg-slate-800">
        <img src={picture} alt={name} className="object-cover w-full h-full" />
      </div>

      {/* Name Section */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-100 mb-3 line-clamp-1">
          {name}
        </h3>

         {/* เพิ่มส่วนนี้ — rating display */}
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
          <span className="text-sm font-semibold text-slate-200">
            {totalReviews > 0 ? averageRating.toFixed(1) : "No reviews"}
          </span>
          {totalReviews > 0 && (
            <span className="text-xs text-slate-500">
              ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
            </span>
          )}
        </div>

        {/* Detail Section */}
        <div className="space-y-2 mt-auto">
          <p className="text-sm text-slate-400 flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </p>
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <Phone size={14} className="flex-shrink-0" />
            {tel}
          </p>
        </div>
      </div>
    </div>
  );
}
