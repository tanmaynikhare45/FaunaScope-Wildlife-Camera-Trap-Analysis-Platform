import React from 'react';
import HeatmapMap from "../components/common/HeatmapViwer";
import AnimalCount from "../components/common/AnimalCount";
import NonblankStatistics from "../components/common/NonblankStatistics";

function Dashboard() {
  return (
    <div className="p-4 space-y-6">
      

      

      <section className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Wildlife Heatmap (Serengeti)</h2>
        <p className="text-gray-600 mb-4">Explore wildlife distribution patterns across the Serengeti ecosystem</p>
        <div className="rounded-lg overflow-hidden shadow">
          <HeatmapMap />
        </div>
      </section>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Wildlife Dashboard</h1>
        <p className="text-gray-600">Welcome to your wildlife detection dashboard! Track your discoveries and analyze your data.</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-3 lg:grid-cols-1 gap-6 mb-8">
        <AnimalCount />
        <NonblankStatistics />
      </div>
    </div>
  );
}

export default Dashboard;
