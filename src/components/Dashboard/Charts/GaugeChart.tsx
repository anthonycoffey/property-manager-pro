import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import HighchartsMore from 'highcharts/highcharts-more'; // Required for solid gauge
import SolidGauge from 'highcharts/modules/solid-gauge';   // Required for solid gauge
import { Box, Skeleton, Typography } from '@mui/material';

// Initialize the modules
if (typeof Highcharts === 'object') {
  HighchartsMore(Highcharts);
  SolidGauge(Highcharts);
}

export interface GaugeChartProps {
  options: Highcharts.Options;
  isLoading?: boolean;
  height?: string | number;
  title?: string; // Optional title to display above the chart
}

const GaugeChart: React.FC<GaugeChartProps> = ({ options, isLoading, height = 300, title }) => {
  if (isLoading) {
    return (
      <Box sx={{ height: height, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
        <Skeleton variant="circular" width={typeof height === 'number' ? height * 0.7 : `calc(${height} * 0.7)`} height={typeof height === 'number' ? height * 0.7 : `calc(${height} * 0.7)`} />
      </Box>
    );
  }

  const chartOptions = options ? { ...options } : {};
  // Default to solidgauge chart if not specified
  if (!chartOptions.chart) {
    chartOptions.chart = {};
  }
  if (!chartOptions.chart.type) {
    chartOptions.chart.type = 'solidgauge';
  }

  return (
    <Box sx={{ height: height, width: '100%' }}>
      {/* Highcharts gauge charts often have titles within the chart options, so an external title might be less common or styled differently */}
      {title && <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </Box>
  );
};

export default GaugeChart;
