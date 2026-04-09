import getCampgrounds from "@/libs/getCampgrounds";
import CampgroundSearch from "@/components/CampgroundSearch";

export default async function CampgroundsCatalog() {
  //get campground data
  const campgroundsResponse = await getCampgrounds();
  const campgrounds = campgroundsResponse.data || [];

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-100">
          Explore Campgrounds
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Find the perfect spot for your next adventure
        </p>
      </div>

      {/* send campground data */}
      <CampgroundSearch campgrounds={campgrounds} />
    </div>
  );
}
