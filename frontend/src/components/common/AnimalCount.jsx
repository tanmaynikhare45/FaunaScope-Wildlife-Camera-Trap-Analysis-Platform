import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../utils/api';
import * as d3 from 'd3';

export default function AnimalStatistics() {
  const [statistics, setStatistics] = useState({
    totalImages: 0,
    nonBlankImages: 0,
    totalDetections: 0,
    speciesDistribution: [],
    detectionTrend: [],
    confidenceMetrics: {
      average: 0,
      distribution: [
        { range: '0%', count: 0 },
        { range: '10%', count: 0 },
        { range: '20%', count: 0 },
        { range: '30%', count: 0 },
        { range: '40%', count: 0 },
        { range: '50%', count: 0 },
        { range: '60%', count: 0 },
        { range: '70%', count: 0 },
        { range: '80%', count: 0 },
        { range: '90%', count: 0 }
      ]
    }
  });

  const [loading, setLoading] = useState(true);
  const { makeRequest } = useApi();

  const [timeRange, setTimeRange] = useState('all');
  const speciesChartRef = useRef();
  const trendChartRef = useRef();
  const confidenceChartRef = useRef();

  // Fetch basic statistics from API
  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
    try {
      setLoading(true);
      const mediaData = await makeRequest('media');

      if (!mediaData || mediaData.length === 0) {
        setStatistics(prev => ({ ...prev, totalImages: 0, nonBlankImages: 0 }));
        return;
      }

      const totalImages = mediaData.length;
      const nonBlankMedia = mediaData.filter(m =>
        m.classification === 'non-blank' || m.classification === 'non_blank'
      );
      const nonBlankImages = nonBlankMedia.length;

      // --- Species distribution from real detections ---
      const speciesCounts = {};
      nonBlankMedia.forEach(m => {
        if (m.species) {
          m.species.split(',').forEach(s => {
            const name = s.trim();
            if (name) speciesCounts[name] = (speciesCounts[name] || 0) + 1;
          });
        }
      });
      const totalSpeciesCount = Object.values(speciesCounts).reduce((a, b) => a + b, 0) || 1;
      const speciesDistribution = Object.entries(speciesCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalSpeciesCount) * 100)
        }));

      // --- Detection trend: group non-blank uploads by date ---
      const trendMap = {};
      nonBlankMedia.forEach(m => {
        const dateStr = m.uploaded_at
          ? new Date(m.uploaded_at).toLocaleDateString()
          : null;
        if (dateStr) {
          if (!trendMap[dateStr]) trendMap[dateStr] = { date: new Date(m.uploaded_at), count: 0 };
          trendMap[dateStr].count += 1;
        }
      });
      const detectionTrend = Object.values(trendMap).sort((a, b) => a.date - b.date);

      // --- Total detections (sum of all bounding boxes) ---
      let totalDetections = 0;
      nonBlankMedia.forEach(m => {
        if (m.predictions) {
          try {
            const preds = typeof m.predictions === 'string'
              ? JSON.parse(m.predictions)
              : m.predictions;
            if (Array.isArray(preds)) totalDetections += preds.length;
          } catch { /* ignore */ }
        }
      });

      // --- Confidence distribution ---
      const buckets = ['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%'];
      const confDist = buckets.map(range => ({ range, count: 0 }));
      let confSum = 0;
      let confCount = 0;
      nonBlankMedia.forEach(m => {
        if (m.confidence != null) {
          const idx = Math.min(Math.floor(m.confidence * 10), 9);
          confDist[idx].count += 1;
          confSum += m.confidence;
          confCount += 1;
        }
      });
      const avgConfidence = confCount > 0 ? confSum / confCount : 0;

      setStatistics({
        totalImages,
        nonBlankImages,
        totalDetections,
        speciesDistribution: speciesDistribution.length > 0 ? speciesDistribution : [],
        detectionTrend: detectionTrend.length > 0 ? detectionTrend : [],
        confidenceMetrics: {
          average: avgConfidence,
          distribution: confDist
        }
      });
    } catch (err) {
      console.error('Error fetching basic stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // D3 Chart Components
  useEffect(() => {
    if (statistics.speciesDistribution.length > 0) {
      renderSpeciesChart();
    }
    if (statistics.detectionTrend.length > 0) {
      renderTrendChart();
    }
    if (statistics.confidenceMetrics.distribution.length > 0) {
      renderConfidenceChart();
    }
  }, [statistics]);

  const renderSpeciesChart = () => {
    const data = statistics.speciesDistribution.slice(0, 8);
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    if (!speciesChartRef.current) {
      return;
    }

    d3.select(speciesChartRef.current).selectAll("*").remove();

    const svg = d3.select(speciesChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", "#10b981")
      .attr("rx", 2);

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Y-axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  const renderTrendChart = () => {
    const data = statistics.detectionTrend;
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    if (!trendChartRef.current) {
      return;
    }

    d3.select(trendChartRef.current).selectAll("*").remove();

    const svg = d3.select(trendChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Line
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Points
    svg.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.count))
      .attr("r", 3)
      .attr("fill", "#3b82f6");

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  const renderConfidenceChart = () => {
    const data = statistics.confidenceMetrics.distribution;
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    if (!confidenceChartRef.current) {
      return;
    }

    d3.select(confidenceChartRef.current).selectAll("*").remove();

    const svg = d3.select(confidenceChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.range))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars with gradient based on confidence
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.range))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", (d, i) => d3.interpolateGreens(i / data.length))
      .attr("rx", 2);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Detection Statistics</h2>
        <p className="text-sm text-gray-600">Comprehensive analysis of wildlife detections</p>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.totalImages}</div>
          <div className="text-sm text-gray-600">Total Images</div>
        </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.nonBlankImages}</div>
          <div className="text-sm text-gray-600">With Wildlife</div>
            </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{statistics.totalDetections}</div>
          <div className="text-sm text-gray-600">Total Detections</div>
          </div>
        </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Species Distribution</h3>
          <svg ref={speciesChartRef} className="w-full"></svg>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Species List:</h4>
            {statistics.speciesDistribution.map((species, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{species.name}</span>
                <span className="text-sm font-medium text-gray-900">{species.count}</span>
            </div>
            ))}
          </div>
        </div>

        {/* Detection Trend */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detection Trend</h3>
          <svg ref={trendChartRef} className="w-full"></svg>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Trend Data:</h4>
            {statistics.detectionTrend.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No detection data yet</p>
            ) : (
              statistics.detectionTrend.map((trend, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{trend.date.toLocaleDateString()}</span>
                  <span className="text-sm font-medium text-gray-900">{trend.count} detections</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Confidence Distribution
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Avg: {(statistics.confidenceMetrics.average * 100).toFixed(1)}%)
            </span>
          </h3>
          <svg ref={confidenceChartRef} className="w-full"></svg>
      </div>

        {/* Data Summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unique Species:</span>
              <span className="font-medium">{statistics.speciesDistribution.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Detection Rate:</span>
              <span className="font-medium">
                {statistics.totalImages > 0 
                  ? ((statistics.nonBlankImages / statistics.totalImages) * 100).toFixed(1)
                  : 0}%
              </span>
                  </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg Detections per Image:</span>
              <span className="font-medium">
                {statistics.nonBlankImages > 0
                  ? (statistics.totalDetections / statistics.nonBlankImages).toFixed(1)
                  : 0}
                      </span>
                    </div>
                  </div>
                </div>
          </div>
    </div>
  );
}