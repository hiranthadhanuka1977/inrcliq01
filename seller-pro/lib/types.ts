import type { SellerCollectionConfig } from "@/lib/seller/collection-helpers";
import type { SellerServiceRequestsConfig } from "@/lib/seller/service-requests-helpers";
import type { SettingsBookingRow } from "@/lib/settings/bookings";

export type CollectionPayload = SellerCollectionConfig & {
  slug: string;
  previewHref: string;
};

export type ServiceRequestsPayload = SellerServiceRequestsConfig & {
  slug: string;
  previewHref: string;
};

export type BookingsPayload = {
  bookings: SettingsBookingRow[];
};

export type AvailabilityPayload = {
  dates?: string[];
};
