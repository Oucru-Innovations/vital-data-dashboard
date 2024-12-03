import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Button,
  IconButton,
  Box,
  Tooltip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const Header = ({ onLogout }) => (
  <AppBar
    position="static"
    sx={{
      backgroundColor: '#1565c0', // Less bright blue
      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
      height: 56, // Slightly smaller height
    }}
  >
    <Toolbar
      sx={{
        justifyContent: 'space-between',
        minHeight: '56px', // Match the reduced AppBar height
        px: 2, // Adjust horizontal padding
      }}
    >
      {/* Logo and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src="/logo1.png"
          alt="App Logo"
          sx={{
            height: 36,
            width: 36, // Slightly smaller avatar
          }}
        />
        <Typography
          variant="h6"
          noWrap
          sx={{
            fontWeight: 'bold',
            color: 'white',
            fontSize: '1.1rem', // Slightly smaller font size
          }}
        >
          Clinical Study Dashboard
        </Typography>
      </Box>

      {/* Right Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton sx={{ color: 'white' }}>
            <NotificationsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Settings */}
        <Tooltip title="Settings">
          <IconButton sx={{ color: 'white' }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* User Profile */}
        <Tooltip title="Profile">
          <IconButton sx={{ color: 'white' }}>
            <AccountCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Logout */}
        <Button
          variant="outlined"
          color="inherit"
          onClick={onLogout}
          startIcon={<LogoutIcon fontSize="small" />}
          sx={{
            borderColor: 'white',
            color: 'white',
            fontSize: '0.85rem', // Smaller text
            padding: '4px 12px', // Compact button padding
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'white',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Toolbar>
  </AppBar>
);

export default Header;
