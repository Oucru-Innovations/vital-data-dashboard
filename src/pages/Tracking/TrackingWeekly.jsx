import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Footer from '../../components/toolbars/Footer';
import WeeklyRecruitmentCard from '../../components/cards/TrackingWeeklyPage/WeeklyRecruitmentCard';
import RecruitmentTable from '../../components/tables/TrackingWeeklyPage/RecruitmentTable';
import StudyTimeline from '../../components/charts/TrackingWeeklyPage/StudyTimeline';
import { getPeriodTotalRecruitment, getPeriodTotalScreening, getStudyTimeline, getStudyTracking } from '../../services/apiService';
import {
  inferWeeklyChanges,
  transposeData,
  processTimelineData,
} from './utils/recruitmentProcessing';
import { set } from 'date-fns';

const TrackingWeeklyPage = () => {
  const [recruitmentData, setRecruitmentData] = useState({
    totalWeekly: [],
    studyData: [],
    timelineData: [],
    loading: false
  });

  const [endDate, setEndDate] = useState(new Date());

  const fetchWeeklyData = async () => {
    try {
      setRecruitmentData(prev => ({
        ...prev,
        loading: true
      }));
      
      const response = await getPeriodTotalRecruitment({
        period: 'weekly',
        end_date: endDate.toISOString().split('T')[0]
      });
      
      const weeklyTable = transposeData(response.data);
      const weeklyChange = inferWeeklyChanges(weeklyTable);
      


      setRecruitmentData(prev => ({
        ...prev,
        totalWeekly: weeklyChange,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      setRecruitmentData(prev => ({
        ...prev,
        totalWeekly: [],
        loading: false
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
      const recruitment = await getStudyTracking();

      const recruitmentTable = transposeData(recruitment.data);

      const screening = await getPeriodTotalScreening();
      console.log('screening', screening.data.screening_summary);

      const weeklyTable = recruitmentTable.map((entry) => {
        // TODO match with dates
        const screeningIndex = screening.data.study.indexOf(entry.study);
        if (screeningIndex !== -1) {
          return {
            ...entry,
            screened_number: screening.data.screening_summary[screeningIndex].screened[1]||0,
            cumulative_screened: screening.data.screening_summary[screeningIndex].cummulative_screened[1]||0,
          };
        }
        return {
          ...entry,
          screening_summary: null
        };
      });


      console.log('weeklyTable', weeklyTable)
      setRecruitmentData(prev => ({
        ...prev,
        studyData: weeklyTable,
      }));
      // console.log('weeklyTable', weeklyTable, 'aaa', response)
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setRecruitmentData(prev => ({ ...prev, loading: true }));
      await Promise.all([
        fetchWeeklyData(),
        fetchTimelineData(),
        fetchRecruitmentData(),
      ]);
      setRecruitmentData(prev => ({ ...prev, loading: false }));
    };
    fetchData();
  }, [endDate]);


  const handleEndDateChange = (newDate) => {
    setEndDate(newDate);
  };


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
        Weekly Recruitment Tracking
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        
        {/* <Grid item xs={12} md={6}> */}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              slotProps={{ textField: { fullWidth: true } }}
              maxDate={new Date()}
            />
          </LocalizationProvider>
        {/* </Grid> */}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
        {        
        recruitmentData.totalWeekly?.length > 0 ? (
          recruitmentData.totalWeekly.map((weekData, index) => (
            <WeeklyRecruitmentCard
              key={index}
              week={weekData.week}
              totalRecruited={weekData.totalrecruited}
              change={weekData.change}
              loading={recruitmentData.loading}
            />
          ))
        ) : (
          <WeeklyRecruitmentCard
            week="No Data"
            totalRecruited="0"
            change="0"
            loading={false}
          />
        )}
      </Box>

      <RecruitmentTable data={recruitmentData.studyData} endDate = {endDate} />

      <StudyTimeline studies={recruitmentData.timelineData} currentDate={endDate} /> 

      <Footer />
    </Box>
  );
};

export default TrackingWeeklyPage;
