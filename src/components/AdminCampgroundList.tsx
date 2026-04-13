"use client";
import { useState } from "react";
import { CampgroundItem } from "../../interface";
import updateCampground from "@/libs/updateCampgrounds";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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

  // TODO: add UI
  return null;
}
