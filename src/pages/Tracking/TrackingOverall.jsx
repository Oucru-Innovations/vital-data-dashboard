import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import Footer from '../../components/toolbars/Footer';
import MonthlyRecruitmentCard from '../../components/cards/TrackingOverallPage/MonthlyRecruitmentCard';
import RecruitmentTable from '../../components/tables/TrackingOverallPage/RecruitmentTable';
import StudyTimeline from '../../components/charts/TrackingOverallPage/StudyTimeline';
import { getOverallRecruitment, getStudyTimeline, getStudyTracking } from '../../services/apiService';
import {
  inferMonthlyChanges,
  transposeData,
  processTimelineData,
} from './utils/recruitmentProcessing';

const TrackingOverallPage = () => {
  const [recruitmentData, setRecruitmentData] = useState({
    totalMonthly: [],
    studyData: [],
    timelineData: [],
    loading: false
  });

  const fetchMonthlyData = async () => {
    try {
      const response = await getOverallRecruitment();
      const monthlyTable = transposeData(response.data);
      const monthlyChange = inferMonthlyChanges(monthlyTable);
      setRecruitmentData(prev => ({
        ...prev,
        totalMonthly: monthlyChange
      }))      
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setRecruitmentData(prev => ({
        ...prev,
        totalMonthly: []
      }));
    }
  };

  const fetchTimelineData = async () => {
    try {
      const response = await getStudyTimeline();
      const timelineTable = transposeData(response.data);
      const processedTimeline = processTimelineData(timelineTable);
      setRecruitmentData(prev => ({
        ...prev,
        timelineData: processedTimeline
      }));
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    }
  };

  const fetchRecruitmentData = async () => {
    try {
      const response = await getStudyTracking();
      const monthlyTable = transposeData(response).slice(-10);
      setRecruitmentData(prev => ({
        ...prev,
        studyData: monthlyTable,
      }));
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchMonthlyData(),
        fetchTimelineData(),
        fetchRecruitmentData(),
      ]);
    };
    fetchData();
  }, []);

  if (recruitmentData.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Overall Recruitment Tracking
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
        {recruitmentData.totalMonthly?.map((monthData, index) => (
          <MonthlyRecruitmentCard
            key={index}
            month={monthData.month}
            totalRecruited={monthData.totalrecruited}
            change={monthData.change}
            loading={recruitmentData.loading}
          />
        ))}
      </Box>

      <RecruitmentTable data={recruitmentData.studyData.slice(-10)} />

      <StudyTimeline studies={recruitmentData.timelineData} />

      <Footer />
    </Box>
  );
};

export default TrackingOverallPage;
