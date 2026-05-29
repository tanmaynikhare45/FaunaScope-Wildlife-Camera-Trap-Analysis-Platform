import { Outlet, Link, Navigate, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { ExpandableTabs } from "../common/NavBar";
import { Home, Upload, BarChart, Camera, Zap } from "lucide-react";

function Layout() {
  const navigate = useNavigate();

  const tabs = [
    { title: "Home", icon: Home, path: "/" },
    { type: "separator" },
    { title: "Upload", icon: Upload, path: "/upload" },
    { type: "separator" },
    { title: "Dashboard", icon: BarChart, path: "/dashboard" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section - Simplified */}
            <Link 
              to="/" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Zap className="h-6 w-6 text-green-800" />
              <h1 className="text-xl font-bold text-green-800 font-roboto">
                FaunaScope
              </h1>
            </Link>

            {/* Navigation Center */}
            <SignedIn>
              <div className="flex-1 max-w-2xl mx-8">
                <ExpandableTabs
                  tabs={tabs}
                  activeColor="text-white"
                  activeBgColor="bg-green-800"
                  inactiveColor="text-gray-600"
                  onChange={(index) => {
                    const tab = tabs[index];
                    if (tab?.path) navigate(tab.path);
                  }}
                />
              </div>
            </SignedIn>

            {/* User Section */}
            <SignedIn>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 px-3 py-1.5 rounded-full border border-gray-300">
                  <Camera className="h-4 w-4 text-green-800" />
                  <span>Wildlife Monitoring</span>
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-9 h-9 border border-gray-300",
                    }
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SignedOut>
          <Navigate to="/sign-in" replace={true} />
        </SignedOut>
        <SignedIn>
          <Outlet />
        </SignedIn>
      </main>
    </div>
  );
}

export default Layout;