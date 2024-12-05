import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WatchIcon from '@mui/icons-material/Watch';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ImageIcon from '@mui/icons-material/Image';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Wearables', icon: <WatchIcon />, path: '/wearables' },
    { text: 'Ultrasound', icon: <MedicalServicesIcon />, path: '/ultrasound' },
    { text: 'Images', icon: <ImageIcon />, path: '/images' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: isCollapsed ? 80 : 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isCollapsed ? 80 : 240,
          transition: 'width 0.3s',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      {/* Toolbar */}
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          alignItems: 'center',
          px: 2,
        }}
      >
        {!isCollapsed && (
          <Typography
            variant="h6"
            sx={{
              color: '#1976d2',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              fontSize: '18px',
            }}
          >
            Vital-Data Dashboard
          </Typography>
        )}
        <IconButton
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            color: '#1976d2',
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />

      {/* Menu Items */}
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => (
          <Tooltip
            key={item.text}
            title={isCollapsed ? item.text : ''}
            placement="right"
            arrow
          >
            <ListItem
              onClick={() => handleNavigation(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                },
                margin: isCollapsed ? '6px auto' : '4px 12px',
                padding: isCollapsed ? '8px' : '10px',
                transition: 'all 0.3s',
              }}
            >
              <ListItemIcon
                sx={{
                  color: '#1976d2',
                  justifyContent: 'center',
                  minWidth: isCollapsed ? '40px' : 'auto',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#424242',
                  }}
                />
              )}
            </ListItem>
          </Tooltip>
        ))}
      </List>

      {/* Footer */}
      {!isCollapsed && (
        <Box
          sx={{
            mt: 'auto',
            mb: 2,
            textAlign: 'center',
            fontSize: '12px',
            color: '#9e9e9e',
          }}
        >
          © 2024 Vital Data Dashboard
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
