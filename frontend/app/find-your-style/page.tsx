"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StyleItemCard } from "@/components/style-item-card";
import { GenerateButton } from "@/components/try-on/generate-button";
import { PhotoRequiredModal } from "@/components/try-on/photo-required-modal";
import {
  findYourStyle,
  StyleItem,
  FindStyleItemsParams,
} from "@/lib/style-api";
import { useApi } from "@/lib/api";
import type { WardrobeItem } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShoppingBag, Shirt } from "lucide-react";

export default function FindYourStylePage() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const api = useApi();

  // Tab state
  const [activeTab, setActiveTab] = useState<"commerce" | "wardrobe">(
    "commerce",
  );

  // Commerce items state
  const [items, setItems] = useState<StyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FindStyleItemsParams>({
    limit: 50,
  });

  // Wardrobe items state
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [wardrobeLoading, setWardrobeLoading] = useState(false);
  const [wardrobeError, setWardrobeError] = useState<string | null>(null);

  // Photo check state
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null);
  const [checkingPhoto, setCheckingPhoto] = useState(true);

  // Virtual Try-On State (unified for both types)
  const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if user has uploaded a photo
  const checkUserPhoto = async () => {
    try {
      setCheckingPhoto(true);
      const token = await getToken();
      if (!token) {
        setHasPhoto(false);
        return;
      }

      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!userResponse.ok) {
        setHasPhoto(false);
        return;
      }

      const user = await userResponse.json();
      setHasPhoto(!!user.tryOnPhotoUrl);

      const genderMap: Record<string, string> = {
        MALE: "MEN",
        FEMALE: "WOMEN",
        MEN: "MEN",
        WOMEN: "WOMEN",
      };

      setFilters((prev) => {
        if (prev.gender) return prev;
        const mappedGender = user.gender ? genderMap[user.gender] : undefined;
        if (!mappedGender) return prev;
        return {
          ...prev,
          gender: mappedGender,
        };
      });
    } catch (err) {
      console.error("Error checking user photo:", err);
      setHasPhoto(false);
    } finally {
      setCheckingPhoto(false);
    }
  };

  useEffect(() => {
    checkUserPhoto();
  }, []);

  // Load wardrobe items
  const loadWardrobeItems = async () => {
    if (!clerkUser?.id) return;

    try {
      setWardrobeLoading(true);
      setWardrobeError(null);

      const items = await api.wardrobeApi.getAll(clerkUser.id);
      setWardrobeItems(items);
    } catch (err: any) {
      console.error("Error loading wardrobe items:", err);
      setWardrobeError(err.message || "Failed to load wardrobe items");
    } finally {
      setWardrobeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "wardrobe" && clerkUser?.id) {
      loadWardrobeItems();
    }
  }, [activeTab, clerkUser?.id]);

  const loadItems = async (currentPage: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await findYourStyle(token, {
        ...filters,
        page: currentPage,
      });

      setItems(response.items);
      setTotal(response.total);
      setPage(response.page);
    } catch (err: any) {
      console.error("Error loading style items:", err);
      setError(err.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "commerce") {
      loadItems(1);
    }
  }, [filters, activeTab]);

  const handleFilterChange = (
    key: keyof FindStyleItemsParams,
    value: string,
  ) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadItems(newPage);
  };

  // Handle item selection (works for both commerce and wardrobe)
  const handleItemSelect = (item: any) => {
    setSelectedItems((prev) => {
      const category = item.category;

      if (prev[category]?._id === item._id) {
        const { [category]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [category]: item,
      };
    });
  };

  // Handle generate try-on
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!userResponse.ok) {
        setError("Failed to fetch user profile");
        return;
      }

      const user = await userResponse.json();
      const userPhotoUrl = user.tryOnPhotoUrl;

      if (!userPhotoUrl) {
        setError(
          "Please upload a photo of yourself first to use Virtual Try-On.",
        );
        return;
      }

      sessionStorage.setItem(
        "try-on:selected-items",
        JSON.stringify(selectedItems),
      );
      sessionStorage.setItem("try-on:user-photo", userPhotoUrl);
      router.push("/try-on/generate");
    } catch (err: any) {
      console.error("Error generating try-on:", err);
      setError(err.message || "Failed to generate try-on image");
    } finally {
      setIsGenerating(false);
    }
  };

  const totalPages = Math.ceil(total / (filters.limit || 50));

  if (checkingPhoto) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (hasPhoto === false) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              Virtual Try-On
            </h1>
            <p className="mt-2 text-muted-foreground">
              Discover fashion items that match your unique style
            </p>
          </div>
          <PhotoRequiredModal isOpen={true} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Virtual Try-On
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover fashion items that match your unique style
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "commerce" | "wardrobe")}
        >
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="commerce" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Find Your Style
              </TabsTrigger>
              <TabsTrigger value="wardrobe" className="gap-2">
                <Shirt className="h-4 w-4" />
                My Wardrobe
              </TabsTrigger>
            </TabsList>

            <GenerateButton
              selectedItemsCount={Object.keys(selectedItems).length}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>

          {/* Commerce Tab */}
          <TabsContent value="commerce" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={filters.gender || "all"}
                onValueChange={(value) => handleFilterChange("gender", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="MEN">Men</SelectItem>
                  <SelectItem value="WOMEN">Women</SelectItem>
                  <SelectItem value="UNISEX">Unisex</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.category || "all"}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="TOP">Tops</SelectItem>
                  <SelectItem value="BOTTOM">Bottoms</SelectItem>
                  <SelectItem value="FOOTWEAR">Footwear</SelectItem>
                  <SelectItem value="OUTERWEAR">Outerwear</SelectItem>
                  <SelectItem value="DRESS">Dress</SelectItem>
                  <SelectItem value="ACCESSORY">Accessories</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.store || "all"}
                onValueChange={(value) => handleFilterChange("store", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  <SelectItem value="zara">Zara</SelectItem>
                  <SelectItem value="hm">H&M</SelectItem>
                  <SelectItem value="mango">Mango</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.brand || "all"}
                onValueChange={(value) => handleFilterChange("brand", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="Zara">Zara</SelectItem>
                  <SelectItem value="H&M">H&M</SelectItem>
                  <SelectItem value="Mango">Mango</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {items.length} of {total} items
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            )}

            {/* Items Grid */}
            {!loading && !error && items.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <StyleItemCard
                    key={item._id}
                    item={item}
                    isSelected={selectedItems[item.category]?._id === item._id}
                    onSelect={handleItemSelect}
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-muted-foreground">No items found</p>
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe" className="space-y-6">
            {/* Loading */}
            {wardrobeLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error */}
            {wardrobeError && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
                {wardrobeError}
              </div>
            )}

            {/* Items Grid */}
            {!wardrobeLoading && !wardrobeError && wardrobeItems.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wardrobeItems.map((item) => (
                  <StyleItemCard
                    key={item._id}
                    item={item}
                    isSelected={selectedItems[item.category]?._id === item._id}
                    onSelect={handleItemSelect}
                  />
                ))}
              </div>
            )}

            {/* Empty */}
            {!wardrobeLoading &&
              !wardrobeError &&
              wardrobeItems.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                  <Shirt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No items in your wardrobe yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add items to your wardrobe to use them for virtual try-on
                  </p>
                </div>
              )}
          </TabsContent>
        </Tabs>

        {/* Selected Items Debug */}
        {Object.keys(selectedItems).length > 0 && (
          <div className="rounded-lg border border-primary bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary mb-2">
              Selected Items ({Object.keys(selectedItems).length}):
            </p>
            <div className="space-y-1">
              {Object.entries(selectedItems).map(
                ([category, item]: [string, any]) => (
                  <p key={category} className="text-xs text-muted-foreground">
                    <span className="font-medium">{category}:</span> {item.name}
                  </p>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
