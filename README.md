
# Vital Data Dashboard React Application

This is a React-based Vital Data Dashboard application designed to visualize and manage data from clinical studies, including data from wearables, ultrasounds, and images.

![Vital Data Dashboard](./assets/animation.gif)
<!-- ![Last Commit](https://img.shields.io/github/last-commit/Oucru-Innovations/vital-data-dashboard)
![Dependencies](https://img.shields.io/david/Oucru-Innovations/vital-data-dashboard)
![Issues](https://img.shields.io/github/issues/Oucru-Innovations/vital-data-dashboard)
![Pull Requests](https://img.shields.io/github/issues-pr/Oucru-Innovations/vital-data-dashboard) -->
![React](https://img.shields.io/badge/React-17.0.2-blue?logo=react) 
![Material-UI](https://img.shields.io/badge/Material--UI-5.0.0-blue?logo=mui) 
![License](https://img.shields.io/badge/license-MIT-green)

## Key Features

- **User Authentication**: Secure login/logout functionality with token-based authentication - (to be implemented).
- **Dynamic Header**: Includes notifications, settings, and user profile actions with a clean and compact design - (to be implemented).
- **Data Visualization**: Interactive plots and information display for clinical data (to be implemented).

## Getting Started

Follow these instructions to set up and run the project on local machine.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 14 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clinical-dashboard.git
   cd clinical-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm start
   ```

2. Open browser and navigate to [http://localhost:3000](http://localhost:3000).

## Scripts

### `npm start`
Runs the app in development mode. The page will auto-reload after changes, and lint errors are displayed in the console.

### `npm test`
Launches the test runner in interactive watch mode. Refer to the [running tests guide](https://facebook.github.io/create-react-app/docs/running-tests) for more details.

### `npm run build`
Builds the app for production to the `build` folder. React will be bundled and optimized for the best performance. The app is then ready to be deployed.

### `npm run eject`
**Note**: Ejecting is a one-way operation. Once ejected, you cannot go back. This exposes the build tools for advanced customization.

## Project Structure

```
clinical-dashboard/
├── public/
│   ├── index.html        # Main HTML file
│   └── logo.png          # Application logo
├── src/
│   ├── components/       # Reusable components (Sidebar, Header, etc.)
│   ├── pages/            # Application pages (Dashboard, Wearables, etc.)
│   ├── config/           # Configuration files (routes, etc.)
│   ├── styles/           # Global styles (optional)
│   └── App.js            # Main application component
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

## Learn More

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

## Future Enhancements

- **Data Visualization**: Integration of Plotly.js or D3.js for advanced data plots.
- **Role-Based Access Control**: Manage user permissions for different roles.
- **Backend Integration**: API connections for real-time data retrieval and updates.
- **Progressive Web App (PWA)**: Convert the app into a PWA for offline access.

---
