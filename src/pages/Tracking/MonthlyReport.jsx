import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import Footer from '../../components/toolbars/Footer';
import MonthlyRecruitmentCard from '../../components/cards/TrackingMonthlyPage/MonthlyRecruitmentCard';
import RecruitmentTable from '../../components/tables/TrackingMonthlyPage/RecruitmentTable';
import StudyTimeline from '../../components/charts/TrackingMonthlyPage/StudyTimeline';
import { getPeriodTotalRecruitment, getStudyTimeline, getStudyTracking, getStudyLifetimeRecruitment } from '../../services/apiService';
import {
  inferMonthlyChanges,
  transposeData,
  processTimelineData,
} from './utils/recruitmentProcessing';
import { renderRecruitmentChart } from '../../components/charts/TrackingStudyPage/TimelineChart';

const MonthlyReport = () => {
  const [recruitmentData, setRecruitmentData] = useState({
    totalMonthly: [],
    studyData: [],
    timelineData: [],
    stages: [],
    loading: false
  });
  const [selectedStudy, setSelectedStudy] = useState(() => {
    // Initialize from localStorage or default to empty string
    return localStorage.getItem('selectedStudy') || '';
  });
  const [selectedTimepoint, setSelectedTimepoint] = useState('monthly');
  const [endDate, setEndDate] = useState(new Date());

  const fetchMonthlyData = async () => {
    try {
      const response = await getStudyTracking({
        period: selectedTimepoint,
        limit: 12,
        sort: 'date DESC',
        end_date: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        study: selectedStudy
      });
      const monthlyTable = transposeData(response.data);
      console.log('monthlyTable', monthlyTable, inferMonthlyChanges(monthlyTable))
      const monthlyChange = inferMonthlyChanges(monthlyTable);
      setRecruitmentData(prev => ({
        ...prev,
        studyData: monthlyTable,
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

  // const fetchRecruitmentData = async () => {
  //   try {
  //     const response = await getStudyTracking();
  //     const monthlyTable = transposeData(response);
  //     setRecruitmentData(prev => ({
  //       ...prev,
  //       studyData: monthlyTable,
  //     }));
  //   } catch (error) {
  //     console.error('Error fetching recruitment data:', error);
  //   }
  // };

  const fetchStudyProgressData = async () => {
    try {
      const response = await getStudyLifetimeRecruitment(selectedStudy);
      const monthlyData = transposeData(response.data);
      setRecruitmentData(prev => ({
        ...prev,
        stages: monthlyData || []
      }));
    } catch (error) {
      console.error('Error fetching study progress data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setRecruitmentData(prev => ({ ...prev, loading: true }));
      await Promise.all([
        fetchTimelineData(),
        fetchMonthlyData(),
        // fetchRecruitmentData(),
        // fetchStudyProgressData()
      ]);
      setRecruitmentData(prev => ({ ...prev, loading: false }));
    };
    fetchData();
  }, [selectedStudy,selectedTimepoint, endDate]);


  const handleStudyChange = (event) => {
    const newStudy = event.target.value;
    setSelectedStudy(newStudy);
    // Save to localStorage
    localStorage.setItem('selectedStudy', newStudy);
  };

  const handleTimepointChange = (event) => {
    setSelectedTimepoint(event.target.value);
  };

  const handleEndDateChange = (newDate) => {
    setEndDate(newDate);
  };

  // const filteredData = selectedStudy
  //   ? recruitmentData.studyData.filter(study => study.study === selectedStudy)
  //   : recruitmentData.studyData;

  if (recruitmentData.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
console.log('recruitmentData', recruitmentData)
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Monthly Recruitment Report
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Select Study</InputLabel>
            <Select
              value={selectedStudy}
              onChange={handleStudyChange}
              label="Select Study"
            >
              <MenuItem value="">All Studies</MenuItem>
              {recruitmentData.timelineData.map((study, idx) => (
                <MenuItem key={idx} value={study.name}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Select Timepoint</InputLabel>
            <Select
              value={selectedTimepoint}
              onChange={handleTimepointChange}
              label="Select Timepoint"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              slotProps={{ textField: { fullWidth: true } }}
              maxDate={new Date()}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
        {
        // recruitmentData.totalMonthly?.length > 0 ? (
          recruitmentData.totalMonthly.map((monthData, index) => (
            <MonthlyRecruitmentCard
              key={index}
              date={monthData.date}
              totalRecruited={monthData.totalrecruited}
              change={monthData.change}
              loading={recruitmentData.loading}
            />
          ))
        // ) : (
        //   <MonthlyRecruitmentCard
        //     month="No Data"
        //     totalRecruited="0"
        //     change="0"
        //     loading={false}
        //   />
        // )
        }

      </Box>

      <Box sx={{ mt: 4 }}>
        {renderRecruitmentChart(recruitmentData.studyData)}
      </Box>
      <RecruitmentTable data={recruitmentData.studyData} endDate = {endDate} />

      <StudyTimeline studies={recruitmentData.timelineData.filter(study => study.name === selectedStudy)} />


      <Footer />
    </Box>
  );
};

export default MonthlyReport;
