import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../../utils/api';
import * as d3 from 'd3';

export default function NonblankStatistics() {
  const [stats, setStats] = useState({
    totalImages: 0,
    nonBlankCount: 0,
    blankCount: 0,
    nonBlankPercentage: 0,
    averageAnimalsPerImage: 2.5,
    topSpecies: [
      { species: 'zebra', count: 2 },
      { species: 'lion', count: 1 },
      { species: 'elephant', count: 1 },
      { species: 'giraffe', count: 1 }
    ],
    confidenceStats: {
      average: 0.85,
      high: 2,
      medium: 1,
      low: 0
    },
    monthlyBreakdown: {
      'Oct 2025': 3
    },
    processingStatus: {
      processed: 3,
      pending: 0,
      failed: 0
    }
  });

  const [loading, setLoading] = useState(true);
  const { makeRequest } = useApi();

  const classificationChartRef = useRef();
  const confidenceChartRef = useRef();
  const speciesChartRef = useRef();
  const monthlyChartRef = useRef();

  // Fetch basic statistics from API
  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
      try {
        setLoading(true);
        const mediaData = await makeRequest('media');
      
      // Calculate basic stats from real data
      const totalImages = mediaData ? mediaData.length : 0;
      const nonBlankCount = mediaData ? mediaData.filter(media => 
        media.classification === 'non-blank' || media.classification === 'non_blank'
      ).length : 0;
      const blankCount = totalImages - nonBlankCount;
      const nonBlankPercentage = totalImages > 0 ? (nonBlankCount / totalImages) * 100 : 0;
      
      // Update only the basic stats, keep mock data for charts
      setStats(prev => ({
        ...prev,
        totalImages,
        nonBlankCount,
        blankCount,
        nonBlankPercentage
      }));
      } catch (err) {
      console.error('Error fetching basic stats:', err);
      // Keep default values if API fails
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (stats.totalImages > 0) {
      renderClassificationChart();
      renderConfidenceChart();
      renderSpeciesChart();
      renderMonthlyChart();
    }
  }, [stats]);

  const renderClassificationChart = () => {
    const data = [
      { label: 'Non-Blank', value: stats.nonBlankCount, color: '#10b981' },
      { label: 'Blank', value: stats.blankCount, color: '#6b7280' }
    ];
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    if (!classificationChartRef.current) {
      return;
    }

    d3.select(classificationChartRef.current).selectAll("*").remove();

    const svg = d3.select(classificationChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Bars
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.label))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.value))
      .attr("fill", d => d.color)
      .attr("rx", 2);

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    // Y-axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .style("font-size", "10px");
  };

  const renderConfidenceChart = () => {
    const data = [
      { label: 'High', value: stats.confidenceStats.high, color: '#10b981' },
      { label: 'Medium', value: stats.confidenceStats.medium, color: '#f59e0b' },
      { label: 'Low', value: stats.confidenceStats.low, color: '#ef4444' }
    ];
    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;

    if (!confidenceChartRef.current) {
      return;
    }

    d3.select(confidenceChartRef.current).selectAll("*").remove();

    const svg = d3.select(confidenceChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = g.selectAll(".arc")
      .data(pie(data))
      .join("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => d.data.color);

    arcs.append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.data.value);
  };

  const renderSpeciesChart = () => {
    const data = stats.topSpecies.slice(0, 5);
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
      .domain(data.map(d => d.species))
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
      .attr("x", d => x(d.species))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", "#3b82f6")
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

  const renderMonthlyChart = () => {
    const data = Object.entries(stats.monthlyBreakdown).map(([month, count]) => ({
      month,
      count
    }));
    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    if (!monthlyChartRef.current) {
      return;
    }

    d3.select(monthlyChartRef.current).selectAll("*").remove();

    const svg = d3.select(monthlyChartRef.current)
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
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
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d.count))
      .attr("fill", "#8b5cf6")
      .attr("rx", 2);

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "10px");

    // Y-axis
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
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Image Analysis Dashboard</h2>
        <p className="text-sm text-gray-600">Comprehensive statistics on blank vs non-blank image classification</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{stats.totalImages}</div>
          <div className="text-sm text-gray-600">Total Images</div>
            </div>
        <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="text-2xl font-bold text-green-700">{stats.nonBlankCount}</div>
          <div className="text-sm text-green-600">Non-Blank</div>
          <div className="text-xs text-green-500">{stats.nonBlankPercentage.toFixed(1)}%</div>
          </div>
        <div className="text-center p-4 border border-gray-200 rounded-lg">
          <div className="text-2xl font-bold text-gray-700">{stats.blankCount}</div>
          <div className="text-sm text-gray-600">Blank</div>
          <div className="text-xs text-gray-500">
            {stats.totalImages > 0 ? ((stats.blankCount / stats.totalImages) * 100).toFixed(1) : 0}%
        </div>
      </div>
        <div className="text-center p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="text-2xl font-bold text-blue-700">{stats.averageAnimalsPerImage.toFixed(1)}</div>
          <div className="text-sm text-blue-600">Avg Animals</div>
          <div className="text-xs text-blue-500">per image</div>
            </div>
          </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Classification */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Image Classification</h3>
          <svg ref={classificationChartRef} className="w-full"></svg>
          </div>

        {/* Confidence Distribution */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Confidence Distribution
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Avg: {(stats.confidenceStats.average * 100).toFixed(1)}%)
            </span>
          </h3>
          <svg ref={confidenceChartRef} className="w-full"></svg>
      </div>

      {/* Top Species */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Detected Species</h3>
          <svg ref={speciesChartRef} className="w-full"></svg>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Species List:</h4>
            {stats.topSpecies.map(({ species, count }, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{species}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Activity Trend</h3>
          <svg ref={monthlyChartRef} className="w-full"></svg>
          </div>
        </div>
    </div>
  );
}