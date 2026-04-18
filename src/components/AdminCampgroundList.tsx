"use client";
import { useState } from "react";
import { CampgroundItem } from "../../interface";
import updateCampground from "@/libs/updateCampgrounds";
import deleteCampground from "@/libs/deleteCampgrounds";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import createCampground from "@/libs/createCampground";
import { Search, Pencil, Trash2, Plus, MapPin, Phone, X } from "lucide-react";

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTel, setNewTel] = useState("");
  const [newPicture, setNewPicture] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Campground name is required"); return; }
    if (!newAddress.trim()) { toast.error("Address is required"); return; }
    if (!newTel.trim()) { toast.error("Phone number is required"); return; }
    if (!newPicture.trim()) { toast.error("Picture URL is required"); return; }
    try {
      await createCampground(token, newName.trim(), newAddress.trim(), newTel.trim(), newPicture.trim());
      toast.success(`Campground "${newName}" created successfully!`);
      setShowCreateModal(false);
      setNewName(""); setNewAddress(""); setNewTel(""); setNewPicture("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create campground";
      toast.error(msg);
    }
  };

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
    if (!editName.trim()) { toast.error("Campground name is required"); return; }
    if (!editAddress.trim()) { toast.error("Address is required"); return; }
    if (!editTel.trim()) { toast.error("Phone number is required"); return; }
    if (!editPicture.trim()) { toast.error("Picture URL is required"); return; }
    setSavingId(id);
    try {
      await updateCampground(token, id, editName, editAddress, editTel, editPicture);
      toast.success("Campground updated successfully!");
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("Failed to update campground. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\nThis action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteCampground(token, id);
      toast.success(`"${name}" has been deleted.`);
      router.refresh();
    } catch {
      toast.error("Failed to delete campground. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header: Search + Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search campgrounds..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={15} /> Add Campground
        </button>
      </div>

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
                { placeholder: "Address", value: editAddress, setter: setEditAddress },
                { placeholder: "Tel", value: editTel, setter: setEditTel },
                { placeholder: "Picture URL", value: editPicture, setter: setEditPicture },
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
                  disabled={savingId === item._id}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-green-400 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
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
                  disabled={deletingId === item._id}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-orange-400 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id, item.name)}
                  disabled={deletingId === item._id}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-slate-800 text-red-400 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Create New Campground</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            {[
              { label: "Name", placeholder: "e.g. Pine Valley Camp", value: newName, setter: setNewName },
              { label: "Address", placeholder: "e.g. 123 Forest Rd", value: newAddress, setter: setNewAddress },
              { label: "Tel", placeholder: "e.g. 053-123-456", value: newTel, setter: setNewTel },
              { label: "Picture URL", placeholder: "https://example.com/image.jpg", value: newPicture, setter: setNewPicture },
            ].map(({ label, placeholder, value, setter }) => (
              <div key={label} className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
                <input type="text" placeholder={placeholder} value={value} onChange={(e) => setter(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2.5 text-sm border border-slate-700 focus:outline-none focus:border-orange-400 transition-colors placeholder:text-slate-600" />
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> Create Campground
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}