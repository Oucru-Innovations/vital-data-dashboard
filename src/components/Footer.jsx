import React from 'react';
import { Box, Typography, Link, Grid, IconButton } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        backgroundColor: '#1a1a1a',
        color: 'white',
        borderTop: '1px solid #444',
      }}
    >
      <Grid container alignItems="center" justifyContent="space-between">
        {/* Branding and App Info */}
        <Grid item>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'white' }}>
            Vital Data Dashboard
          </Typography>
          <Typography variant="caption" color="gray">
            Version 1.0.0 © {new Date().getFullYear()} Oxford University Clinical Research Unit.
          </Typography>
        </Grid>

        {/* Quick Links */}
        <Grid item>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/documentation" underline="hover" color="inherit" sx={{ fontSize: '0.875rem' }}>
              Documentation
            </Link>
            <Link href="/support" underline="hover" color="inherit" sx={{ fontSize: '0.875rem' }}>
              Support
            </Link>
          </Box>
        </Grid>

        {/* Social Media */}
        <Grid item>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              href="https://facebook.com"
              target="_blank"
              sx={{ color: 'white', '&:hover': { color: '#4267B2' }, fontSize: 'small' }}
            >
              <FacebookIcon fontSize="small" />
            </IconButton>
            <IconButton
              href="https://twitter.com"
              target="_blank"
              sx={{ color: 'white', '&:hover': { color: '#1DA1F2' }, fontSize: 'small' }}
            >
              <TwitterIcon fontSize="small" />
            </IconButton>
            <IconButton
              href="https://linkedin.com"
              target="_blank"
              sx={{ color: 'white', '&:hover': { color: '#0077B5' }, fontSize: 'small' }}
            >
              <LinkedInIcon fontSize="small" />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Footer;
