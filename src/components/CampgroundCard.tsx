import { MapPin, Phone, Flame } from "lucide-react";

export interface CardProps {
  name: string;
  picture: string;
  address: string;
  tel: string;
}

export default function CampgroundCard({
  name,
  picture,
  address,
  tel,
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
