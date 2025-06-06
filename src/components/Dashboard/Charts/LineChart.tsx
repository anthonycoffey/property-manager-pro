import React from 'react';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import { Box, Skeleton, Typography } from '@mui/material';

// Optional: Import Highcharts modules if needed, e.g., for exporting, accessibility
// import HC_exporting from 'highcharts/modules/exporting';
// import HC_accessibility from 'highcharts/modules/accessibility';
// if (typeof Highcharts === 'object') {
//   HC_exporting(Highcharts);
//   HC_accessibility(Highcharts);
// }

export interface LineChartProps {
  options: Highcharts.Options;
  isLoading?: boolean;
  height?: string | number;
  title?: string; // Optional title to display above the chart
}

const LineChart: React.FC<LineChartProps> = ({ options, isLoading, height = 400, title }) => {
  if (isLoading) {
    return (
      <Box sx={{ height: height, width: '100%' }}>
        {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
        <Skeleton variant="rectangular" width="100%" height={typeof height === 'number' ? height - (title ? 30 : 0) : `calc(${height} - ${title ? '30px' : '0px'})`} />
      </Box>
    );
  }

  // Ensure options are not mutated by Highcharts, and provide a default empty object
  const chartOptions = options ? { ...options } : {};

  return (
    <Box sx={{ height: height, width: '100%' }}>
      {title && <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </Box>
  );
};

export default LineChart;
