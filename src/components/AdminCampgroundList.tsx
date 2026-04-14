"use client";
import { useState } from "react";
import { CampgroundItem } from "../../interface";
import updateCampground from "@/libs/updateCampgrounds";
import deleteCampground from "@/libs/deleteCampgrounds";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Pencil, Trash2, Plus, MapPin, Phone } from "lucide-react";


export default function AdminCampgroundList({
  campgrounds,
  token,
}: {
  campgrounds: CampgroundItem[];
  token: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editPicture, setEditPicture] = useState("");
  const [searchName, setSearchName] = useState("");



  const filteredCampgrounds = campgrounds.filter((item) =>
    item.name.toLowerCase().includes(searchName.toLowerCase()),
  );

  const handleEditStart = (item: CampgroundItem) => {
    setEditingId(item._id);
    setEditName(item.name ?? "");
    setEditAddress(item.address ?? "");
    setEditTel(item.tel ?? "");
    setEditPicture(item.picture ?? "");
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateCampground(token, id, editName, editAddress, editTel, editPicture);
      toast.success("success");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Want to delete?")) return;
    try {
      await deleteCampground(token, id);
      toast.success("success");
      router.refresh();
    } catch {
      toast.error("failed");
    }
  };





  // TODO: add UI
  
  return (
    <div className="space-y-4"> 
    
      {/* Campground list */}
      {filteredCampgrounds.map((item: CampgroundItem) => (
        <div
          key={item._id}
          className="border-b border-slate-700/50 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {editingId === item._id ? (
            <div className="space-y-2 flex-1">
              {[
                { placeholder: "Name", value: editName, setter: setEditName },
                {
                  placeholder: "Address",
                  value: editAddress,
                  setter: setEditAddress,
                },
                { placeholder: "Tel", value: editTel, setter: setEditTel },
                {
                  placeholder: "Picture URL",
                  value: editPicture,
                  setter: setEditPicture,
                },
              ].map(({ placeholder, value, setter }) => (
                <input
                  key={placeholder}
                  type="text"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 rounded-md px-3 py-2 text-sm border border-slate-700 focus:outline-none"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-white font-semibold">{item.name}</h2>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <MapPin size={14} /> {item.address}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <Phone size={14} /> {item.tel}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {editingId === item._id ? (
              <>
                <button
                  onClick={() => handleEditSave(item._id)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-green-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEditStart(item)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-orange-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-red-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
    
}
