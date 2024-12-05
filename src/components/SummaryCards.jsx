import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import BarChartIcon from '@mui/icons-material/BarChart';
import FunctionsIcon from '@mui/icons-material/Functions';
import PieChartIcon from '@mui/icons-material/PieChart';

const icons = {
  'Total Files Collected': <InsertDriveFileIcon fontSize="medium" />,
  'Total Days Collected': <CalendarTodayIcon fontSize="medium" />,
  'Total Duration': <AccessTimeIcon fontSize="medium" />,
  'Total File Size': <StorageIcon fontSize="medium" />,
  'Study with Maximum Files': <LeaderboardIcon fontSize="medium" />,
  'Study with Largest Data Size': <FolderOpenIcon fontSize="medium" />,
  'Most Common File Type': <BarChartIcon fontSize="medium" />,
  // 'Average File Size': <FunctionsIcon fontSize="large" />,
  'Largest File Type': <PieChartIcon fontSize="medium" />,
};

const SummaryCard = ({ title, value, color }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color[50],
      border: `2px solid ${color[700]}`,
      borderRadius: 2,
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'scale(1.05)',
      },
    }}
  >
    <Box sx={{ mb: 2, color: color[800] }}>
      {icons[title] || <InsertDriveFileIcon fontSize="large" />} {/* Fallback icon */}
    </Box>
    <Typography variant="h6" sx={{ fontWeight: 'bold', color: color[800] }}>
      {title}
    </Typography>
    <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: color[700] }}>
      {value}
    </Typography>
  </Paper>
);

export default SummaryCard;
