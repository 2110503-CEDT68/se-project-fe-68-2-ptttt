export interface CampgroundItem {
  _id: string;
  name: string;
  address: string;
  tel: string;
  picture: string;
  id: string;
  sumRating:number;
  countReview:number;
  ratingCount: number[];
}

export interface CampgroundJson {
  success: boolean;
  count: number;
  data: CampgroundItem[];
}

export interface User {
  _id: string;
  name: string;
  tel: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

export interface BookingItem {
  _id: string;
  bookingDate: string;
  nights: number;
  user: User;
  campground: CampgroundItem;
}

export interface BookingJson {
  success: boolean;
  count: number;
  data: BookingItem[];
}
