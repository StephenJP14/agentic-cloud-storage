"use client";

import { categories } from "@/modules/products/data";
import {
  NewProduct,
  Product,
  ProductSegment,
  ProductType,
} from "@/services/product";
import { useEffect, useState } from "react";

interface UpdateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdate: (updatedProduct: Product) => void;
}

export default function UpdateProductModal({
  isOpen,
  onClose,
  product,
  onUpdate,
}: UpdateProductModalProps) {
  const [productType, setProductType] = useState<ProductType>("");
  const [productName, setProductName] = useState("");
  const [productSegment, setProductSegment] = useState<ProductSegment>("B2C");
  const [specifications, setSpecifications] = useState("");
  const [warrantyLength, setWarrantyLength] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ecommerceUrl, setEcommerceUrl] = useState("");
  const [shopeeUrl, setShopeeUrl] = useState("")
  const [tokopediaUrl, setTokopediaUrl] = useState("")

  // Image handling for update: backend-go returns base64 string, but for upload we will set a File
  const [displayImage, setDisplayImage] = useState<File | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setProductType(product.product_type as ProductType);
      setProductName(product.product_name);
      setProductSegment(product.product_segment as ProductSegment);
      setSpecifications(product.specifications);
      setWarrantyLength(product.warranty_length);
      setPrice(product.price);
      setHeadline(product.headline || "");
      setSubheadline(product.subheadline || "");
      setEcommerceUrl(product.ecommerce_url || "");
      setShopeeUrl(product.shopee_url || "");
      setTokopediaUrl(product.tokopedia_url || "");

      // If backend-go returned base64 image, show it as preview
      if (product.display_image && typeof product.display_image === "string") {
        setPreviewUrl(`data:image/png;base64,${product.display_image}`);
        setDisplayImage(undefined);
      } else {
        setPreviewUrl(null);
        setDisplayImage(undefined);
      }
    }
  }, [product]);

  // Manage object URL lifecycle for a newly selected file
  useEffect(() => {
    if (!displayImage) return;
    const objectUrl = URL.createObjectURL(displayImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [displayImage]);

  const handleSubmit = () => {
    if (!product) return;

    const updatedProduct: Product = {
      ...product,
      product_type: productType,
      product_name: productName,
      product_segment: productSegment,
      specifications: specifications,
      warranty_length: warrantyLength,
      price: price,
      headline: headline,
      subheadline: subheadline,
      ecommerce_url: ecommerceUrl,
      shopee_url: shopeeUrl,
      tokopedia_url: tokopediaUrl,
      // Only attach a file if user selected a new one — otherwise omit to preserve existing backend-go image
      ...(displayImage ? { display_image: displayImage } : {}),
    };

    onUpdate(updatedProduct);
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Update Product</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col gap-4">
          {/* UPLOAD IMAGE */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Display Image</label>

            {/* Preview Box */}
            {previewUrl ? (
              <div className="relative w-full h-48 rounded-md border-2 border-dashed border-gray-300 overflow-hidden group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain bg-gray-50"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => {
                      setDisplayImage(undefined);
                      setPreviewUrl(null);
                    }}
                    className="bg-white text-red-600 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm"
                  >
                    Remove & Replace
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDisplayImage(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-2xl">+</span>
                  <span className="text-xs">Click to upload product image</span>
                </div>
              </div>
            )}
          </div>

          {/* PRODUCT NAME */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Name</label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="text"
              placeholder="Product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          {/* PRODUCT TYPE */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Type</label>
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
            >
              {categories.map((c) => (
                <option value={c.value} key={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* PRODUCT SEGMENT */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Segment</label>
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={productSegment}
              onChange={(e) =>
                setProductSegment(e.target.value as ProductSegment)
              }
            >
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
              <option value="B2G">B2G</option>
            </select>
          </div>

          {/* WARRANTY */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">
              Warranty Length (days)
            </label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="number"
              min={0}
              value={warrantyLength}
              onChange={(e) => setWarrantyLength(Number(e.target.value))}
            />
          </div>


          {/* PRICE */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Price</label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-400">
              E-Commerce URL{" "}
              <span>
                (<a target="_blank" href={ecommerceUrl} className="hover:underline text-blue-600">preview</a>)
              </span>
            </label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="text"
              placeholder="https://"
              value={ecommerceUrl}
              onChange={(e) => setEcommerceUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-400">
              Shopee URL{" "}
              <span>
                (<a target="_blank" href={shopeeUrl} className="hover:underline text-blue-600">preview</a>)
              </span>
            </label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="text"
              placeholder="https://"
              value={shopeeUrl}
              onChange={(e) => setShopeeUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-400">
              Tokopedia URL{" "}
              <span>
                (<a target="_blank" href={tokopediaUrl} className="hover:underline text-blue-600">preview</a>)
              </span>
            </label>
            <input
              className="p-2 border border-gray-300 rounded-md"
              type="text"
              placeholder="https://"
              value={tokopediaUrl}
              onChange={(e) => setTokopediaUrl(e.target.value)}
            />
          </div>

          {/* SPECIFICATIONS */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">
              Specifications (please separate by '|' per spec)
            </label>
            <textarea
              className="p-2 border border-gray-300 rounded-md min-h-30"
              placeholder="ex: Intel i7500 | SSD nVme 526 GB | DDR 8GB RAM"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
            />
          </div>

          {/* 4. Hubungkan UI Textarea */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Headline</label>
            <textarea
              className="p-2 border border-gray-300 rounded-md min-h-30"
              placeholder="Headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Subheadline</label>
            <textarea
              className="p-2 border border-gray-300 rounded-md min-h-30"
              placeholder="Subheadline"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-(--z-red) hover:bg-(--z-red-dark) text-white rounded-md"
          >
            Update Product
          </button>
        </div>
      </div>
    </div>
  );
}
