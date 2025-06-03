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

export interface BarChartProps {
  options: Highcharts.Options;
  isLoading?: boolean;
  height?: string | number;
  title?: string; // Optional title to display above the chart
}

const BarChart: React.FC<BarChartProps> = ({ options, isLoading, height = 400, title }) => {
  if (isLoading) {
    return (
      <Box sx={{ height: height, width: '100%' }}>
        {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
        <Skeleton variant="rectangular" width="100%" height={typeof height === 'number' ? height - (title ? 30 : 0) : `calc(${height} - ${title ? '30px' : '0px'})`} />
      </Box>
    );
  }

  const chartOptions = options ? { ...options } : {};
  // Default to column chart if not specified, can be overridden by options.chart.type
  if (!chartOptions.chart) {
    chartOptions.chart = {};
  }
  if (!chartOptions.chart.type) {
    chartOptions.chart.type = 'column'; 
  }


  return (
    <Box sx={{ height: height, width: '100%' }}>
      {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </Box>
  );
};

export default BarChart;
