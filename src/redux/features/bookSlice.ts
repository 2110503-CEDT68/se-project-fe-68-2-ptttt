import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BookingItem } from "../../../interface";

type BookState = {
  bookItems: BookingItem[];
};

const initialState: BookState = { bookItems: [] };

export const bookSlice = createSlice({
  name: "bookSlice",
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<BookingItem>) => {
      const alreadyExists = state.bookItems.some(
        (item) => item.campground._id === action.payload.campground._id,
      );
      if (!alreadyExists) {
        state.bookItems.push(action.payload);
      }
    },
    removeBooking: (state, action: PayloadAction<BookingItem>) => {
      const remainItems = state.bookItems.filter((obj) => {
        return (
          obj.campground.name !== action.payload.campground.name ||
          obj.bookingDate !== action.payload.bookingDate
        );
      });
      state.bookItems = remainItems;
    },
  },
});

export const { addBooking, removeBooking } = bookSlice.actions;
export default bookSlice.reducer;
