import React, { useState } from 'react';
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
import Collapse from '@mui/material/Collapse';
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import SummarizeIcon from '@mui/icons-material/Summarize';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import SourceIcon from '@mui/icons-material/Source';

const ListItemBody = ({ item, isCollapsed, onClick, level = 0, isOpen }) => {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <Tooltip
      title={isCollapsed ? item.text : ''}
      placement="right"
      arrow
    >
      <ListItem
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
          },
          margin: isCollapsed ? '6px auto' : level === 0 ? '4px 12px' : '2px 12px',
          padding: isCollapsed ? '8px' : level === 0 ? '10px' : '6px',
          paddingRight: hasChildren && level === 0 ? '16px' : '10px',
          transition: 'all 0.3s',
        }}
      >
        <ListItemIcon
          sx={{
            color: '#1976d2',
            justifyContent: 'center',
            minWidth: isCollapsed ? '40px' : 'auto',
            marginRight: isCollapsed ? 0 : '12px',
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!isCollapsed && (
          <>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                fontSize: level === 0 ? '14px' : '13px',
                fontWeight: level === 0 ? '500' : '400',
                color: level === 0 ? '#424242' : '#666666',
              }}
            />
            {level === 0 && hasChildren && (
              <Box component="span" sx={{ ml: 'auto' }}>
                {isOpen ? <ExpandLess /> : <ExpandMore />}
              </Box>
            )}
          </>
        )}
      </ListItem>
    </Tooltip>
  );
};

const MenuItem = ({ item, isCollapsed, level = 0 }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setOpen(!open);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      <ListItemBody
        item={item}
        isCollapsed={isCollapsed}
        onClick={handleClick}
        level={level}
        isOpen={open}
      />
      {hasChildren && !isCollapsed && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child, index) => (
              <Box key={index} sx={{ pl: (level + 1) * 1.5 }}>
                <MenuItem
                  item={child}
                  isCollapsed={isCollapsed}
                  level={level + 1}
                />
              </Box>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    {
      text: 'Summary',
      icon: <SummarizeIcon />,
      // path: '/summary',
      children: [
        { text: 'DataType', icon: <DataUsageIcon />, path: '/summary/datatype' },
        { text: 'Study', icon: <SourceIcon />, path: '/summary/study' },
        { text: 'Condition', icon: <MedicalInformationIcon />, path: '/summary/condition' },
        { text: 'Device', icon: <DevicesOtherIcon />, path: '/summary/device' },
      ],
    },
    {
      text: 'Tracking',
      icon: <SignalCellularAltIcon />,
      children: [
        { text: 'Active Recruitment', icon: <CheckCircleIcon />, path: '/tracking/overall' },
        { text: 'Study Recruitment', icon: <AssessmentIcon />, path: '/tracking/study' },
      ],
    },
  ];
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
        {menuItems.map((item, index) => (
          <MenuItem key={index} item={item} isCollapsed={isCollapsed} />
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
          © Oct 2024 VITAL Data Dashboard
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
