import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import users from '../mock/users';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  Paper,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState(localStorage.getItem('rememberMe') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') !== null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    const validUser = users.find(
      (user) => user.username === username && user.password === password
    );

    if (validUser) {
      localStorage.setItem('authToken', 'mockToken123');
      if (rememberMe) {
        localStorage.setItem('rememberMe', username);
      } else {
        localStorage.removeItem('rememberMe');
      }
      onLogin(true);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        position: 'relative',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        {/* Left Logos */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <img
            src="/logos/oucru_logo.png"
            alt="Oucru"
            style={{ height: '60px', maxWidth: '60px' }}
          />
          <img
            src="/logos/oxford_logo.png"
            alt="Oxford"
            style={{ height: '60px', maxWidth: '60px' }}
          />
        </Box>

        {/* Right Logo */}
        <img
          src="/logos/wellcome_logo.jpg"
          alt="Wellcome"
          style={{ height: '60px', maxWidth: '60px' }}
        />
      </Box>

      {/* Login Form */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Login
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box
            component="form"
            noValidate
            sx={{ width: '100%', mt: 1 }}
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember Me"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Login
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Link
                href="#"
                variant="body2"
                onClick={() =>
                  alert('Forgot Password functionality is not implemented yet.')
                }
              >
                Forgot Password?
              </Link>
              <Link
                href="#"
                variant="body2"
                onClick={() =>
                  alert('Sign Up functionality is not implemented yet.')
                }
              >
                Don't have an account? Sign Up
              </Link>
              {/* <Link href="/register" variant="body2">
                Don't have an account? Sign Up
              </Link> */}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          mt: 4,
          textAlign: 'center',
          color: 'gray',
          fontSize: '14px',
        }}
      >
        © 2024 Oxford University Clinical Research Unit. All rights reserved.
      </Box>
    </Container>
  );
};

export default Login;
