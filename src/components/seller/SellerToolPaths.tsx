"use client";

import { createContext, useContext } from "react";

export type SellerToolPaths = {
  collectionProducts: string;
  productNew: string;
  product: (id: string) => string;
  serviceRequestsOfferings: string;
  categoryNew: string;
  category: (id: string) => string;
};

export const defaultSellerToolPaths: SellerToolPaths = {
  collectionProducts: "/seller/collection?tab=products",
  productNew: "/seller/collection/products/new",
  product: (id) => `/seller/collection/products/${id}`,
  serviceRequestsOfferings: "/seller/service-requests?tab=offerings",
  categoryNew: "/seller/service-requests/categories/new",
  category: (id) => `/seller/service-requests/categories/${id}`,
};

/** Routes inside the advanced Seller Tools app on port 3011. */
export const sellerProToolPaths: SellerToolPaths = {
  collectionProducts: "/seller-pro?tab=products",
  productNew: "/seller-pro/collection/products/new",
  product: (id) => `/seller-pro/collection/products/${id}`,
  serviceRequestsOfferings: "/seller-pro/service-requests?tab=offerings",
  categoryNew: "/seller-pro/service-requests/categories/new",
  category: (id) => `/seller-pro/service-requests/categories/${id}`,
};

type SellerToolContextValue = {
  paths: SellerToolPaths;
  /** When set, profile and booking links open on the main InrCliq app. */
  mainOrigin: string;
};

const SellerToolContext = createContext<SellerToolContextValue>({
  paths: defaultSellerToolPaths,
  mainOrigin: "",
});

export function SellerToolProvider({
  paths,
  mainOrigin = "",
  children,
}: {
  paths: SellerToolPaths;
  mainOrigin?: string;
  children: React.ReactNode;
}) {
  return (
    <SellerToolContext.Provider value={{ paths, mainOrigin }}>{children}</SellerToolContext.Provider>
  );
}

export function useSellerToolPaths() {
  return useContext(SellerToolContext).paths;
}

export function useSellerMainOrigin() {
  return useContext(SellerToolContext).mainOrigin;
}
