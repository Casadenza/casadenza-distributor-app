"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link as LinkIcon, Package, Layers, Ruler, Check, Loader2, Plus, ImageIcon } from "lucide-react";

export default function NewProductForm() {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState(""); 
  const [collection, setCollection] = useState("");
  const [stoneType, setStoneType] = useState("");
  const [thicknessMm, setThicknessMm] = useState<string>("1");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ LOCAL IMAGE UPLOAD TO CLOUDINARY
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setImage(data.url); // Cloudinary URL set ho jayega
      }
    } catch (err) {
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!sku.trim()) return alert("SKU required");
    if (!name.trim()) return alert("Name required");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          image: image.trim() || null, 
          collection: collection.trim() || null,
          stoneType: stoneType.trim() || null,
          thicknessMm: thicknessMm === "" ? null : Number(thicknessMm),
          isActive,
        }),
      });
      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        alert("Failed to create product");
      }
    } catch (e) {
      alert("Error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Identity & Image Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Image Upload Box */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative aspect-square bg-[#FAFAFA] rounded-[32px] border-2 border-dashed border-[#EEE] flex flex-col items-center justify-center overflow-hidden group hover:border-[#C5A267]/30 transition-all">
            {uploading ? (
              <Loader2 className="animate-spin text-[#C5A267]" size={24} />
            ) : image ? (
              <>
                <img src={image} className="w-full h-full object-cover" />
                <button onClick={() => setImage("")} className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="rotate-45" size={16} />
                </button>
              </>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2 p-6 text-center">
                <div className="h-10 w-10 rounded-2xl bg-white shadow-sm border border-[#F0F0F0] flex items-center justify-center text-zinc-400 group-hover:text-[#C5A267] transition-colors">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Upload Photo</p>
                  <p className="text-[8px] text-zinc-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Identity Inputs */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          <div className="bg-[#FAFAFA]/50 p-6 rounded-[32px] border border-[#F5F5F5] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5A267] ml-1">SKU Identity</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
                  <input className="w-full pl-10 pr-4 py-3 bg-white border border-[#EEE] rounded-2xl text-xs font-mono focus:border-[#C5A267] outline-none transition-all uppercase" placeholder="e.g. CST 01" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5A267] ml-1">Surface Name</label>
                <input className="w-full px-5 py-3 bg-white border border-[#EEE] rounded-2xl text-sm font-serif italic focus:border-[#C5A267] outline-none transition-all" placeholder="e.g. Alaskan Haze" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Characteristics & Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-[32px] border border-[#F0F0F0]">
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Collection</label>
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
            <input className="w-full pl-10 pr-4 py-3 bg-[#F8F8F8] border-transparent rounded-2xl text-xs focus:bg-white focus:border-[#EEE] outline-none transition-all" placeholder="e.g. Fusion" value={collection} onChange={(e) => setCollection(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Stone Type</label>
          <input className="w-full px-5 py-3 bg-[#F8F8F8] border-transparent rounded-2xl text-xs focus:bg-white focus:border-[#EEE] outline-none transition-all" placeholder="e.g. Marble" value={stoneType} onChange={(e) => setStoneType(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Thickness (mm)</label>
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
            <input type="number" className="w-full pl-10 pr-4 py-3 bg-[#F8F8F8] border-transparent rounded-2xl text-xs focus:bg-white focus:border-[#EEE] outline-none transition-all" value={thicknessMm} onChange={(e) => setThicknessMm(e.target.value)} step="0.1" />
          </div>
        </div>

        <div className="flex items-center h-full pt-4 sm:pt-6 ml-2">
          <button type="button" onClick={() => setIsActive(!isActive)} className="flex items-center gap-2 group">
            <div className={`w-4 h-4 rounded-lg border flex items-center justify-center transition-all ${isActive ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#DDD]'}`}>
              {isActive && <Check size={10} className="text-white" />}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-black">Online Status</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-[#F9F9F9]">
        <button className="flex-1 px-8 py-3 rounded-2xl border border-[#EEE] text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:bg-zinc-50 transition-all" onClick={() => router.push("/admin/products")} disabled={saving}>Discard</button>
        <button className="flex-[2] px-8 py-3 rounded-2xl bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-zinc-200 transition-all flex items-center justify-center gap-2" onClick={submit} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Publish to Catalog"}
        </button>
      </div>
    </div>
  );
}