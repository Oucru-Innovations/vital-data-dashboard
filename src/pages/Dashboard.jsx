import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import SummaryCards from '../components/SummaryCards';

const mockData = [
  { title: 'Total Participants', value: 120 },
  { title: 'Devices Connected', value: 95 },
  { title: 'Completed Uploads', value: 85 },
  { title: 'Alerts', value: 3 },
];

const Dashboard = () => {
  const [page, setPage] = useState('Dashboard');

  return (
    <div style={{ display: 'flex' }}>
      {/* <Sidebar onSelect={(page) => setPage(page)} /> */}
      <main style={{ flexGrow: 1, padding: '20px' }}>
        {/* <Header /> */}
        {page === 'Dashboard' && <SummaryCards data={mockData} />}
        {/* Add page-specific components here */}
      </main>
    </div>
  );
};

export default Dashboard;
