import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import { Box, Skeleton, Typography } from '@mui/material';

// Optional: Import Highcharts modules if needed
// import HC_exporting from 'highcharts/modules/exporting';
// import HC_accessibility from 'highcharts/modules/accessibility';
// if (typeof Highcharts === 'object') {
//   HC_exporting(Highcharts);
//   HC_accessibility(Highcharts);
// }

export interface PieChartProps {
  options: Highcharts.Options;
  isLoading?: boolean;
  height?: string | number;
  title?: string; // Optional title to display above the chart
}

const PieChart: React.FC<PieChartProps> = ({ options, isLoading, height = 400, title }) => {
  if (isLoading) {
    return (
      <Box sx={{ height: height, width: '100%' }}>
        {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
        <Skeleton variant="circular" width={typeof height === 'number' ? height * 0.8 : `calc(${height} * 0.8)`} height={typeof height === 'number' ? height * 0.8 : `calc(${height} * 0.8)`} sx={{ margin: 'auto' }} />
      </Box>
    );
  }

  const chartOptions = options ? { ...options } : {};
  // Default to pie chart if not specified
  if (!chartOptions.chart) {
    chartOptions.chart = {};
  }
  if (!chartOptions.chart.type) {
    chartOptions.chart.type = 'pie';
  }

  return (
    <Box sx={{ height: height, width: '100%' }}>
      {title && <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>{title}</Typography>}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </Box>
  );
};

export default PieChart;
